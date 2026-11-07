import { NOTA_APROBATORIA } from '../../common/enums';
import { execute, select, selectOne, type Db } from '../../db/pool';
import type { Asignatura, Calificacion, DetalleMatricula, Matricula } from '../../domain/types';

const SELECT_MATRICULA = `
  SELECT m.*, CONCAT(p.nombres, ' ', p.apellidos) AS estudiante, p.numero_documento,
         pr.nombre AS programa, pe.nombre AS periodo, pe.estado AS estado_periodo
    FROM matricula m
    JOIN persona p    ON p.id_persona = m.id_persona_estudiante
    JOIN estudiante e ON e.id_persona = m.id_persona_estudiante
    JOIN programa pr  ON pr.id_programa = e.id_programa
    JOIN periodo pe   ON pe.id_periodo = m.id_periodo`;

export interface DetalleContexto extends DetalleMatricula {
  id_persona_estudiante: number;
  estado_matricula: string;
  id_periodo: number;
  estado_periodo: string;
}

export const matriculasRepository = {
  listar(db: Db, f: { estudiante?: number; periodo?: number; estado?: string }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (f.estudiante) { where.push('m.id_persona_estudiante = ?'); params.push(f.estudiante); }
    if (f.periodo) { where.push('m.id_periodo = ?'); params.push(f.periodo); }
    if (f.estado) { where.push('m.estado = ?'); params.push(f.estado); }
    return select<Record<string, unknown>>(
      db,
      `${SELECT_MATRICULA} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY pe.fecha_inicio DESC, p.apellidos`,
      params,
    );
  },

  obtenerDetallada(db: Db, id: number) {
    return selectOne<Record<string, unknown>>(db, `${SELECT_MATRICULA} WHERE m.id_matricula = ?`, [id]);
  },

  buscarPorId(db: Db, id: number, bloquear = false) {
    return selectOne<Matricula>(db, `SELECT * FROM matricula WHERE id_matricula = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  },

  buscarPorEstudiantePeriodo(db: Db, idEstudiante: number, idPeriodo: number) {
    return selectOne<Matricula>(db, 'SELECT * FROM matricula WHERE id_persona_estudiante = ? AND id_periodo = ?', [idEstudiante, idPeriodo]);
  },

  async insertar(db: Db, m: Omit<Matricula, 'id_matricula'>): Promise<number> {
    const r = await execute(
      db,
      'INSERT INTO matricula (id_persona_estudiante, id_periodo, fecha_matricula, estado) VALUES (?, ?, ?, ?)',
      [m.id_persona_estudiante, m.id_periodo, m.fecha_matricula, m.estado],
    );
    return r.insertId;
  },

  actualizarEstado(db: Db, id: number, estado: string) {
    return execute(db, 'UPDATE matricula SET estado = ? WHERE id_matricula = ?', [estado, id]);
  },

  eliminar(db: Db, id: number) {
    return execute(db, 'DELETE FROM matricula WHERE id_matricula = ?', [id]);
  },

  // ----- DETALLE_MATRICULA -----
  detalles(db: Db, idMatricula: number) {
    return select<Record<string, unknown>>(
      db,
      `SELECT dm.*, g.codigo AS grupo, g.modalidad, a.id_asignatura, a.codigo AS codigo_asignatura, a.nombre AS asignatura, a.creditos,
              CONCAT(pd.nombres, ' ', pd.apellidos) AS docente,
              c.nota_final, c.fecha_registro AS fecha_nota, c.observacion
         FROM detalle_matricula dm
         JOIN grupo g      ON g.id_grupo = dm.id_grupo
         JOIN asignatura a ON a.id_asignatura = g.id_asignatura
         JOIN persona pd   ON pd.id_persona = g.id_docente
         LEFT JOIN calificacion c ON c.id_detalle = dm.id_detalle
        WHERE dm.id_matricula = ?
        ORDER BY a.codigo`,
      [idMatricula],
    );
  },

  async contarDetalles(db: Db, idMatricula: number): Promise<number> {
    const r = await selectOne<{ total: number }>(db, 'SELECT COUNT(*) AS total FROM detalle_matricula WHERE id_matricula = ?', [idMatricula]);
    return Number(r?.total ?? 0);
  },

  /** Detalle con los datos de su matrícula y periodo (para validar reglas). */
  obtenerDetalleContexto(db: Db, idDetalle: number) {
    return selectOne<DetalleContexto>(
      db,
      `SELECT dm.*, m.id_persona_estudiante, m.estado AS estado_matricula, m.id_periodo, pe.estado AS estado_periodo
         FROM detalle_matricula dm
         JOIN matricula m ON m.id_matricula = dm.id_matricula
         JOIN periodo pe  ON pe.id_periodo = m.id_periodo
        WHERE dm.id_detalle = ?`,
      [idDetalle],
    );
  },

  buscarDetalle(db: Db, idMatricula: number, idGrupo: number) {
    return selectOne<DetalleMatricula>(db, 'SELECT * FROM detalle_matricula WHERE id_matricula = ? AND id_grupo = ?', [idMatricula, idGrupo]);
  },

  async insertarDetalle(db: Db, d: Omit<DetalleMatricula, 'id_detalle'>): Promise<number> {
    const r = await execute(
      db,
      'INSERT INTO detalle_matricula (id_matricula, id_grupo, fecha_registro, estado) VALUES (?, ?, ?, ?)',
      [d.id_matricula, d.id_grupo, d.fecha_registro, d.estado],
    );
    return r.insertId;
  },

  actualizarDetalle(db: Db, idDetalle: number, estado: string, fecha?: string) {
    return fecha
      ? execute(db, 'UPDATE detalle_matricula SET estado = ?, fecha_registro = ? WHERE id_detalle = ?', [estado, fecha, idDetalle])
      : execute(db, 'UPDATE detalle_matricula SET estado = ? WHERE id_detalle = ?', [estado, idDetalle]);
  },

  retirarTodos(db: Db, idMatricula: number) {
    return execute(db, "UPDATE detalle_matricula SET estado = 'Retirado' WHERE id_matricula = ? AND estado = 'Inscrito'", [idMatricula]);
  },

  finalizarTodos(db: Db, idMatricula: number) {
    return execute(db, "UPDATE detalle_matricula SET estado = 'Finalizado' WHERE id_matricula = ? AND estado = 'Inscrito'", [idMatricula]);
  },

  /** Otra inscripción vigente de la misma asignatura dentro de la matrícula. */
  asignaturaYaInscrita(db: Db, idMatricula: number, idAsignatura: number) {
    return selectOne<{ id_detalle: number; grupo: string }>(
      db,
      `SELECT dm.id_detalle, g.codigo AS grupo FROM detalle_matricula dm JOIN grupo g ON g.id_grupo = dm.id_grupo
        WHERE dm.id_matricula = ? AND g.id_asignatura = ? AND dm.estado <> 'Retirado'`,
      [idMatricula, idAsignatura],
    );
  },

  async asignaturaEnPlan(db: Db, idPrograma: number, idAsignatura: number): Promise<boolean> {
    const r = await selectOne(db, 'SELECT 1 AS ok FROM plan_estudio WHERE id_programa = ? AND id_asignatura = ?', [idPrograma, idAsignatura]);
    return r !== undefined;
  },

  async asignaturaAprobada(db: Db, idEstudiante: number, idAsignatura: number): Promise<boolean> {
    const r = await selectOne(
      db,
      `SELECT 1 AS ok FROM matricula m
         JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
         JOIN grupo g              ON g.id_grupo = dm.id_grupo
         JOIN calificacion c       ON c.id_detalle = dm.id_detalle
        WHERE m.id_persona_estudiante = ? AND g.id_asignatura = ? AND dm.estado <> 'Retirado' AND c.nota_final >= ?
        LIMIT 1`,
      [idEstudiante, idAsignatura, NOTA_APROBATORIA],
    );
    return r !== undefined;
  },

  /** Prerrequisitos de la asignatura que el estudiante todavía no ha aprobado. */
  prerrequisitosPendientes(db: Db, idEstudiante: number, idAsignatura: number) {
    return select<Asignatura>(
      db,
      `SELECT a.* FROM prerrequisito pr
         JOIN asignatura a ON a.id_asignatura = pr.id_asignatura_requerida
        WHERE pr.id_asignatura = ?
          AND NOT EXISTS (
                SELECT 1 FROM matricula m
                  JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
                  JOIN grupo g              ON g.id_grupo = dm.id_grupo
                  JOIN calificacion c       ON c.id_detalle = dm.id_detalle
                 WHERE m.id_persona_estudiante = ?
                   AND g.id_asignatura = pr.id_asignatura_requerida
                   AND dm.estado <> 'Retirado'
                   AND c.nota_final >= ?)`,
      [idAsignatura, idEstudiante, NOTA_APROBATORIA],
    );
  },

  /** Bloques de horario de los grupos en que el estudiante está inscrito en el periodo. */
  bloquesDelEstudiante(db: Db, idEstudiante: number, idPeriodo: number) {
    return select<{ dia_semana: string; hora_inicio: string; hora_fin: string; grupo: string; codigo_asignatura: string; asignatura: string; aula: string; id_grupo: number }>(
      db,
      `SELECT h.dia_semana, h.hora_inicio, h.hora_fin, g.id_grupo, g.codigo AS grupo,
              a.codigo AS codigo_asignatura, a.nombre AS asignatura, au.codigo AS aula
         FROM matricula m
         JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
         JOIN grupo g              ON g.id_grupo = dm.id_grupo
         JOIN asignatura a         ON a.id_asignatura = g.id_asignatura
         JOIN horario h            ON h.id_grupo = g.id_grupo
         JOIN aula au              ON au.id_aula = h.id_aula
        WHERE m.id_persona_estudiante = ? AND m.id_periodo = ? AND dm.estado = 'Inscrito'
        ORDER BY FIELD(h.dia_semana, 'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'), h.hora_inicio`,
      [idEstudiante, idPeriodo],
    );
  },

  // ----- CALIFICACION -----
  obtenerCalificacion(db: Db, idDetalle: number) {
    return selectOne<Calificacion>(db, 'SELECT * FROM calificacion WHERE id_detalle = ?', [idDetalle]);
  },

  /** S-11: 0..1 calificación por detalle (la PK garantiza el máximo de una). */
  guardarCalificacion(db: Db, c: Calificacion) {
    return execute(
      db,
      `INSERT INTO calificacion (id_detalle, nota_final, fecha_registro, observacion) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nota_final = VALUES(nota_final), fecha_registro = VALUES(fecha_registro), observacion = VALUES(observacion)`,
      [c.id_detalle, c.nota_final, c.fecha_registro, c.observacion],
    );
  },

  eliminarCalificacion(db: Db, idDetalle: number) {
    return execute(db, 'DELETE FROM calificacion WHERE id_detalle = ?', [idDetalle]);
  },

  listarCalificaciones(db: Db, f: { periodo?: number; grupo?: number; estudiante?: number; asignatura?: number }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (f.periodo) { where.push('m.id_periodo = ?'); params.push(f.periodo); }
    if (f.grupo) { where.push('dm.id_grupo = ?'); params.push(f.grupo); }
    if (f.estudiante) { where.push('m.id_persona_estudiante = ?'); params.push(f.estudiante); }
    if (f.asignatura) { where.push('g.id_asignatura = ?'); params.push(f.asignatura); }
    return select<Record<string, unknown>>(
      db,
      `SELECT c.*, p.id_persona, CONCAT(p.nombres, ' ', p.apellidos) AS estudiante,
              a.codigo AS codigo_asignatura, a.nombre AS asignatura, g.codigo AS grupo, pe.nombre AS periodo
         FROM calificacion c
         JOIN detalle_matricula dm ON dm.id_detalle = c.id_detalle
         JOIN matricula m          ON m.id_matricula = dm.id_matricula
         JOIN persona p            ON p.id_persona = m.id_persona_estudiante
         JOIN grupo g              ON g.id_grupo = dm.id_grupo
         JOIN asignatura a         ON a.id_asignatura = g.id_asignatura
         JOIN periodo pe           ON pe.id_periodo = m.id_periodo
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY pe.fecha_inicio DESC, a.codigo, p.apellidos`,
      params,
    );
  },
};
