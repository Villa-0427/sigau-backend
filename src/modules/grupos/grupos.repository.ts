import { execute, select, selectOne, setClause, type Db } from '../../db/pool';
import type { Grupo, Horario } from '../../domain/types';

const SELECT_GRUPO = `
  SELECT g.*,
         a.codigo AS codigo_asignatura, a.nombre AS asignatura, a.creditos,
         CONCAT(p.nombres, ' ', p.apellidos) AS docente,
         pe.nombre AS periodo, pe.estado AS estado_periodo,
         (SELECT COUNT(*) FROM detalle_matricula dm
           WHERE dm.id_grupo = g.id_grupo AND dm.estado <> 'Retirado') AS inscritos
    FROM grupo g
    JOIN asignatura a ON a.id_asignatura = g.id_asignatura
    JOIN persona p    ON p.id_persona = g.id_docente
    JOIN periodo pe   ON pe.id_periodo = g.id_periodo`;

export interface GrupoListado extends Grupo {
  codigo_asignatura: string;
  asignatura: string;
  creditos: number;
  docente: string;
  periodo: string;
  estado_periodo: string;
  inscritos: number;
}

export interface FiltrosGrupo {
  asignatura?: number;
  periodo?: number;
  docente?: number;
  modalidad?: string;
}

export const gruposRepository = {
  async listar(db: Db, f: FiltrosGrupo) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (f.asignatura) { where.push('g.id_asignatura = ?'); params.push(f.asignatura); }
    if (f.periodo) { where.push('g.id_periodo = ?'); params.push(f.periodo); }
    if (f.docente) { where.push('g.id_docente = ?'); params.push(f.docente); }
    if (f.modalidad) { where.push('g.modalidad = ?'); params.push(f.modalidad); }
    const filas = await select<GrupoListado>(
      db,
      `${SELECT_GRUPO} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY pe.fecha_inicio DESC, a.codigo, g.codigo`,
      params,
    );
    return filas.map((g) => ({ ...g, inscritos: Number(g.inscritos), cupo_disponible: g.cupo - Number(g.inscritos) }));
  },

  async obtenerDetallado(db: Db, id: number) {
    const g = await selectOne<GrupoListado>(db, `${SELECT_GRUPO} WHERE g.id_grupo = ?`, [id]);
    return g ? { ...g, inscritos: Number(g.inscritos), cupo_disponible: g.cupo - Number(g.inscritos) } : undefined;
  },

  buscarPorId(db: Db, id: number, bloquear = false) {
    return selectOne<Grupo>(db, `SELECT * FROM grupo WHERE id_grupo = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  },

  buscarPorCodigo(db: Db, idPeriodo: number, idAsignatura: number, codigo: string, excluirId = 0) {
    return selectOne<Grupo>(
      db,
      'SELECT * FROM grupo WHERE id_periodo = ? AND id_asignatura = ? AND codigo = ? AND id_grupo <> ?',
      [idPeriodo, idAsignatura, codigo, excluirId],
    );
  },

  async insertar(db: Db, g: Omit<Grupo, 'id_grupo'>): Promise<number> {
    const r = await execute(
      db,
      'INSERT INTO grupo (id_asignatura, id_docente, id_periodo, codigo, cupo, modalidad) VALUES (?, ?, ?, ?, ?, ?)',
      [g.id_asignatura, g.id_docente, g.id_periodo, g.codigo, g.cupo, g.modalidad],
    );
    return r.insertId;
  },

  async actualizar(db: Db, id: number, data: Partial<Grupo>) {
    const set = setClause(data);
    if (!set.sql) return;
    await execute(db, `UPDATE grupo SET ${set.sql} WHERE id_grupo = ?`, [...set.params, id]);
  },

  eliminar(db: Db, id: number) {
    return execute(db, 'DELETE FROM grupo WHERE id_grupo = ?', [id]);
  },

  /** Inscripciones que ocupan cupo (Inscrito o Finalizado). */
  async contarInscritos(db: Db, id: number): Promise<number> {
    const r = await selectOne<{ total: number }>(
      db,
      "SELECT COUNT(*) AS total FROM detalle_matricula WHERE id_grupo = ? AND estado <> 'Retirado'",
      [id],
    );
    return Number(r?.total ?? 0);
  },

  async contarDetalles(db: Db, id: number): Promise<number> {
    const r = await selectOne<{ total: number }>(db, 'SELECT COUNT(*) AS total FROM detalle_matricula WHERE id_grupo = ?', [id]);
    return Number(r?.total ?? 0);
  },

  estudiantes(db: Db, id: number) {
    return select<Record<string, unknown>>(
      db,
      `SELECT dm.id_detalle, p.id_persona, p.tipo_documento, p.numero_documento, p.nombres, p.apellidos, p.email,
              pr.nombre AS programa, dm.estado AS estado_inscripcion, dm.fecha_registro,
              c.nota_final, c.observacion
         FROM detalle_matricula dm
         JOIN matricula m  ON m.id_matricula = dm.id_matricula
         JOIN persona p    ON p.id_persona = m.id_persona_estudiante
         JOIN estudiante e ON e.id_persona = p.id_persona
         JOIN programa pr  ON pr.id_programa = e.id_programa
         LEFT JOIN calificacion c ON c.id_detalle = dm.id_detalle
        WHERE dm.id_grupo = ?
        ORDER BY p.apellidos, p.nombres`,
      [id],
    );
  },

  /** Menor capacidad de las aulas donde el grupo tiene bloques (null si no tiene horario). */
  async capacidadMinimaAulas(db: Db, id: number): Promise<{ capacidad: number; codigo: string } | undefined> {
    return selectOne<{ capacidad: number; codigo: string }>(
      db,
      `SELECT au.capacidad, au.codigo FROM horario h JOIN aula au ON au.id_aula = h.id_aula
        WHERE h.id_grupo = ? ORDER BY au.capacidad ASC LIMIT 1`,
      [id],
    );
  },
};

const SELECT_HORARIO = `
  SELECT h.*, au.codigo AS aula, au.capacidad, g.codigo AS grupo, a.codigo AS codigo_asignatura, a.nombre AS asignatura,
         g.id_docente, g.id_periodo
    FROM horario h
    JOIN aula au      ON au.id_aula = h.id_aula
    JOIN grupo g      ON g.id_grupo = h.id_grupo
    JOIN asignatura a ON a.id_asignatura = g.id_asignatura`;

const ORDEN_DIAS = "FIELD(h.dia_semana, 'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'), h.hora_inicio";

export interface BloqueNuevo {
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}

export const horariosRepository = {
  listarPorGrupo(db: Db, idGrupo: number) {
    return select<Horario & Record<string, unknown>>(db, `${SELECT_HORARIO} WHERE h.id_grupo = ? ORDER BY ${ORDEN_DIAS}`, [idGrupo]);
  },

  listarPorAula(db: Db, idAula: number, idPeriodo?: number) {
    const params: unknown[] = [idAula];
    let filtro = '';
    if (idPeriodo) { filtro = 'AND g.id_periodo = ?'; params.push(idPeriodo); }
    return select<Record<string, unknown>>(db, `${SELECT_HORARIO} WHERE h.id_aula = ? ${filtro} ORDER BY ${ORDEN_DIAS}`, params);
  },

  buscarPorId(db: Db, id: number) {
    return selectOne<Horario>(db, 'SELECT * FROM horario WHERE id_horario = ?', [id]);
  },

  async insertar(db: Db, h: Omit<Horario, 'id_horario'>): Promise<number> {
    const r = await execute(
      db,
      'INSERT INTO horario (id_grupo, id_aula, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?)',
      [h.id_grupo, h.id_aula, h.dia_semana, h.hora_inicio, h.hora_fin],
    );
    return r.insertId;
  },

  async actualizar(db: Db, id: number, data: Partial<Horario>) {
    const set = setClause(data);
    if (!set.sql) return;
    await execute(db, `UPDATE horario SET ${set.sql} WHERE id_horario = ?`, [...set.params, id]);
  },

  eliminar(db: Db, id: number) {
    return execute(db, 'DELETE FROM horario WHERE id_horario = ?', [id]);
  },

  // ---- Detección de cruces (§2.3). Intervalos [inicio, fin): bloques contiguos no se cruzan.
  crucesMismoGrupo(db: Db, idGrupo: number, b: BloqueNuevo, excluirHorario = 0) {
    return select<Record<string, unknown>>(
      db,
      `${SELECT_HORARIO} WHERE h.id_grupo = ? AND h.dia_semana = ? AND h.hora_inicio < ? AND ? < h.hora_fin AND h.id_horario <> ?`,
      [idGrupo, b.dia_semana, b.hora_fin, b.hora_inicio, excluirHorario],
    );
  },

  crucesMismaAula(db: Db, idAula: number, idPeriodo: number, b: BloqueNuevo, excluirHorario = 0) {
    return select<Record<string, unknown>>(
      db,
      `${SELECT_HORARIO} WHERE h.id_aula = ? AND g.id_periodo = ? AND h.dia_semana = ?
          AND h.hora_inicio < ? AND ? < h.hora_fin AND h.id_horario <> ?`,
      [idAula, idPeriodo, b.dia_semana, b.hora_fin, b.hora_inicio, excluirHorario],
    );
  },

  crucesMismoDocente(db: Db, idDocente: number, idPeriodo: number, b: BloqueNuevo, excluirGrupo: number) {
    return select<Record<string, unknown>>(
      db,
      `${SELECT_HORARIO} WHERE g.id_docente = ? AND g.id_periodo = ? AND h.dia_semana = ?
          AND h.hora_inicio < ? AND ? < h.hora_fin AND g.id_grupo <> ?`,
      [idDocente, idPeriodo, b.dia_semana, b.hora_fin, b.hora_inicio, excluirGrupo],
    );
  },
};
