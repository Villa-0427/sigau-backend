import { execute, select, selectOne, setClause, type Db } from '../../db/pool';
import type { Docente, Estudiante, Persona } from '../../domain/types';

const SELECT_PERSONA_CON_ROLES = `
  SELECT p.*,
         e.id_programa, pr.nombre AS programa, e.fecha_ingreso, e.estado AS estado_estudiante,
         d.especialidad, d.estado AS estado_docente,
         (e.id_persona IS NOT NULL) AS es_estudiante,
         (d.id_persona IS NOT NULL) AS es_docente
    FROM persona p
    LEFT JOIN estudiante e ON e.id_persona = p.id_persona
    LEFT JOIN programa pr  ON pr.id_programa = e.id_programa
    LEFT JOIN docente d    ON d.id_persona = p.id_persona`;

export const personasRepository = {
  listar(db: Db, filtros: { rol?: 'estudiante' | 'docente'; texto?: string }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filtros.rol === 'estudiante') where.push('e.id_persona IS NOT NULL');
    if (filtros.rol === 'docente') where.push('d.id_persona IS NOT NULL');
    if (filtros.texto) {
      where.push("(CONCAT(p.nombres, ' ', p.apellidos) LIKE ? OR p.numero_documento LIKE ? OR p.email LIKE ?)");
      const like = `%${filtros.texto}%`;
      params.push(like, like, like);
    }
    const sql = `${SELECT_PERSONA_CON_ROLES} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY p.apellidos, p.nombres`;
    return select<Record<string, unknown>>(db, sql, params);
  },

  obtenerConRoles(db: Db, id: number) {
    return selectOne<Record<string, unknown>>(db, `${SELECT_PERSONA_CON_ROLES} WHERE p.id_persona = ?`, [id]);
  },

  buscarPorId(db: Db, id: number) {
    return selectOne<Persona>(db, 'SELECT * FROM persona WHERE id_persona = ?', [id]);
  },

  buscarPorDocumento(db: Db, tipo: string, numero: string, excluirId = 0) {
    return selectOne<Persona>(
      db,
      'SELECT * FROM persona WHERE tipo_documento = ? AND numero_documento = ? AND id_persona <> ?',
      [tipo, numero, excluirId],
    );
  },

  buscarPorEmail(db: Db, email: string, excluirId = 0) {
    return selectOne<Persona>(db, 'SELECT * FROM persona WHERE email = ? AND id_persona <> ?', [email, excluirId]);
  },

  async insertar(db: Db, p: Omit<Persona, 'id_persona'>): Promise<number> {
    const r = await execute(
      db,
      `INSERT INTO persona (tipo_documento, numero_documento, nombres, apellidos, email, telefono)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [p.tipo_documento, p.numero_documento, p.nombres, p.apellidos, p.email, p.telefono ?? null],
    );
    return r.insertId;
  },

  async actualizar(db: Db, id: number, data: Partial<Persona>) {
    const set = setClause(data);
    if (!set.sql) return;
    await execute(db, `UPDATE persona SET ${set.sql} WHERE id_persona = ?`, [...set.params, id]);
  },

  eliminar(db: Db, id: number) {
    return execute(db, 'DELETE FROM persona WHERE id_persona = ?', [id]);
  },

  // ----- ESTUDIANTE -----
  obtenerEstudiante(db: Db, id: number) {
    return selectOne<Estudiante>(db, 'SELECT * FROM estudiante WHERE id_persona = ?', [id]);
  },
  insertarEstudiante(db: Db, e: Estudiante) {
    return execute(db, 'INSERT INTO estudiante (id_persona, id_programa, fecha_ingreso, estado) VALUES (?, ?, ?, ?)', [
      e.id_persona,
      e.id_programa,
      e.fecha_ingreso,
      e.estado,
    ]);
  },
  async actualizarEstudiante(db: Db, id: number, data: Partial<Estudiante>) {
    const set = setClause(data);
    if (!set.sql) return;
    await execute(db, `UPDATE estudiante SET ${set.sql} WHERE id_persona = ?`, [...set.params, id]);
  },
  eliminarEstudiante(db: Db, id: number) {
    return execute(db, 'DELETE FROM estudiante WHERE id_persona = ?', [id]);
  },
  async contarMatriculas(db: Db, idEstudiante: number): Promise<number> {
    const r = await selectOne<{ total: number }>(db, 'SELECT COUNT(*) AS total FROM matricula WHERE id_persona_estudiante = ?', [idEstudiante]);
    return Number(r?.total ?? 0);
  },

  // ----- DOCENTE -----
  obtenerDocente(db: Db, id: number) {
    return selectOne<Docente>(db, 'SELECT * FROM docente WHERE id_persona = ?', [id]);
  },
  insertarDocente(db: Db, d: Docente) {
    return execute(db, 'INSERT INTO docente (id_persona, especialidad, estado) VALUES (?, ?, ?)', [d.id_persona, d.especialidad ?? null, d.estado]);
  },
  async actualizarDocente(db: Db, id: number, data: Partial<Docente>) {
    const set = setClause(data);
    if (!set.sql) return;
    await execute(db, `UPDATE docente SET ${set.sql} WHERE id_persona = ?`, [...set.params, id]);
  },
  eliminarDocente(db: Db, id: number) {
    return execute(db, 'DELETE FROM docente WHERE id_persona = ?', [id]);
  },
  async contarGrupos(db: Db, idDocente: number, soloPeriodosAbiertos = false): Promise<number> {
    const r = await selectOne<{ total: number }>(
      db,
      `SELECT COUNT(*) AS total FROM grupo g JOIN periodo pe ON pe.id_periodo = g.id_periodo
        WHERE g.id_docente = ? ${soloPeriodosAbiertos ? "AND pe.estado <> 'Cerrado'" : ''}`,
      [idDocente],
    );
    return Number(r?.total ?? 0);
  },
};
