import { execute, select, selectOne, setClause, type Db } from '../../db/pool';
import type { Asignatura, Prerrequisito } from '../../domain/types';

export const asignaturasRepository = {
  listar(db: Db, filtros: { creditosMin?: number; texto?: string }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filtros.creditosMin !== undefined) {
      where.push('creditos >= ?');
      params.push(filtros.creditosMin);
    }
    if (filtros.texto) {
      where.push('(codigo LIKE ? OR nombre LIKE ?)');
      params.push(`%${filtros.texto}%`, `%${filtros.texto}%`);
    }
    return select<Asignatura>(db, `SELECT * FROM asignatura ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY codigo`, params);
  },
  buscarPorId(db: Db, id: number) {
    return selectOne<Asignatura>(db, 'SELECT * FROM asignatura WHERE id_asignatura = ?', [id]);
  },
  buscarPorCodigo(db: Db, codigo: string, excluirId = 0) {
    return selectOne<Asignatura>(db, 'SELECT * FROM asignatura WHERE codigo = ? AND id_asignatura <> ?', [codigo, excluirId]);
  },
  async insertar(db: Db, a: Omit<Asignatura, 'id_asignatura'>): Promise<number> {
    const r = await execute(db, 'INSERT INTO asignatura (codigo, nombre, creditos) VALUES (?, ?, ?)', [a.codigo, a.nombre, a.creditos]);
    return r.insertId;
  },
  async actualizar(db: Db, id: number, data: Partial<Asignatura>) {
    const set = setClause(data);
    if (!set.sql) return;
    await execute(db, `UPDATE asignatura SET ${set.sql} WHERE id_asignatura = ?`, [...set.params, id]);
  },
  eliminar(db: Db, id: number) {
    return execute(db, 'DELETE FROM asignatura WHERE id_asignatura = ?', [id]);
  },
  async contarGrupos(db: Db, id: number): Promise<number> {
    const r = await selectOne<{ total: number }>(db, 'SELECT COUNT(*) AS total FROM grupo WHERE id_asignatura = ?', [id]);
    return Number(r?.total ?? 0);
  },
  programasQueLaIncluyen(db: Db, id: number) {
    return select<Record<string, unknown>>(
      db,
      `SELECT pr.id_programa, pr.nombre, pe.semestre, pe.obligatoria
         FROM plan_estudio pe JOIN programa pr ON pr.id_programa = pe.id_programa
        WHERE pe.id_asignatura = ? ORDER BY pr.nombre`,
      [id],
    );
  },

  // ----- PRERREQUISITO -----
  todosLosPrerrequisitos(db: Db) {
    return select<Prerrequisito>(db, 'SELECT id_asignatura, id_asignatura_requerida FROM prerrequisito');
  },
  requisitosDe(db: Db, id: number) {
    return select<Asignatura>(
      db,
      `SELECT a.* FROM prerrequisito p JOIN asignatura a ON a.id_asignatura = p.id_asignatura_requerida
        WHERE p.id_asignatura = ? ORDER BY a.codigo`,
      [id],
    );
  },
  esRequisitoDe(db: Db, id: number) {
    return select<Asignatura>(
      db,
      `SELECT a.* FROM prerrequisito p JOIN asignatura a ON a.id_asignatura = p.id_asignatura
        WHERE p.id_asignatura_requerida = ? ORDER BY a.codigo`,
      [id],
    );
  },
  obtenerPrerrequisito(db: Db, id: number, idRequerida: number) {
    return selectOne<Prerrequisito>(db, 'SELECT * FROM prerrequisito WHERE id_asignatura = ? AND id_asignatura_requerida = ?', [id, idRequerida]);
  },
  insertarPrerrequisito(db: Db, id: number, idRequerida: number) {
    return execute(db, 'INSERT INTO prerrequisito (id_asignatura, id_asignatura_requerida) VALUES (?, ?)', [id, idRequerida]);
  },
  eliminarPrerrequisito(db: Db, id: number, idRequerida: number) {
    return execute(db, 'DELETE FROM prerrequisito WHERE id_asignatura = ? AND id_asignatura_requerida = ?', [id, idRequerida]);
  },
  eliminarPrerrequisitosDe(db: Db, id: number) {
    return execute(db, 'DELETE FROM prerrequisito WHERE id_asignatura = ? OR id_asignatura_requerida = ?', [id, id]);
  },
};
