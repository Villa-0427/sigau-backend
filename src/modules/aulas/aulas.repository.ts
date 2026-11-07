import { execute, select, selectOne, setClause, type Db } from '../../db/pool';
import type { Aula } from '../../domain/types';

export const aulasRepository = {
  listar(db: Db, filtros: { tipo?: string; capacidadMin?: number }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filtros.tipo) { where.push('tipo = ?'); params.push(filtros.tipo); }
    if (filtros.capacidadMin) { where.push('capacidad >= ?'); params.push(filtros.capacidadMin); }
    return select<Aula>(db, `SELECT * FROM aula ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY codigo`, params);
  },
  buscarPorId(db: Db, id: number) {
    return selectOne<Aula>(db, 'SELECT * FROM aula WHERE id_aula = ?', [id]);
  },
  buscarPorCodigo(db: Db, codigo: string, excluirId = 0) {
    return selectOne<Aula>(db, 'SELECT * FROM aula WHERE codigo = ? AND id_aula <> ?', [codigo, excluirId]);
  },
  async insertar(db: Db, a: Omit<Aula, 'id_aula'>): Promise<number> {
    const r = await execute(db, 'INSERT INTO aula (codigo, capacidad, tipo) VALUES (?, ?, ?)', [a.codigo, a.capacidad, a.tipo]);
    return r.insertId;
  },
  async actualizar(db: Db, id: number, data: Partial<Aula>) {
    const set = setClause(data);
    if (!set.sql) return;
    await execute(db, `UPDATE aula SET ${set.sql} WHERE id_aula = ?`, [...set.params, id]);
  },
  eliminar(db: Db, id: number) {
    return execute(db, 'DELETE FROM aula WHERE id_aula = ?', [id]);
  },
  async contarHorarios(db: Db, id: number): Promise<number> {
    const r = await selectOne<{ total: number }>(db, 'SELECT COUNT(*) AS total FROM horario WHERE id_aula = ?', [id]);
    return Number(r?.total ?? 0);
  },
  /** Mayor cupo entre los grupos de periodos no cerrados que usan el aula. */
  async mayorCupoProgramado(db: Db, id: number): Promise<number> {
    const r = await selectOne<{ cupo: number | null }>(
      db,
      `SELECT MAX(g.cupo) AS cupo FROM horario h
         JOIN grupo g ON g.id_grupo = h.id_grupo
         JOIN periodo pe ON pe.id_periodo = g.id_periodo
        WHERE h.id_aula = ? AND pe.estado <> 'Cerrado'`,
      [id],
    );
    return Number(r?.cupo ?? 0);
  },
};
