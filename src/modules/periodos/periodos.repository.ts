import { execute, select, selectOne, setClause, type Db } from '../../db/pool';
import type { Periodo } from '../../domain/types';

export const periodosRepository = {
  listar(db: Db, estado?: string) {
    return select<Periodo>(
      db,
      `SELECT * FROM periodo ${estado ? 'WHERE estado = ?' : ''} ORDER BY fecha_inicio DESC`,
      estado ? [estado] : [],
    );
  },
  buscarPorId(db: Db, id: number) {
    return selectOne<Periodo>(db, 'SELECT * FROM periodo WHERE id_periodo = ?', [id]);
  },
  buscarPorNombre(db: Db, nombre: string, excluirId = 0) {
    return selectOne<Periodo>(db, 'SELECT * FROM periodo WHERE nombre = ? AND id_periodo <> ?', [nombre, excluirId]);
  },
  /** Periodos cuyas fechas se traslapan con [inicio, fin]. */
  traslapados(db: Db, inicio: string, fin: string, excluirId = 0) {
    return select<Periodo>(
      db,
      'SELECT * FROM periodo WHERE fecha_inicio <= ? AND ? <= fecha_fin AND id_periodo <> ?',
      [fin, inicio, excluirId],
    );
  },
  async insertar(db: Db, p: Omit<Periodo, 'id_periodo'>): Promise<number> {
    const r = await execute(db, 'INSERT INTO periodo (nombre, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?)', [
      p.nombre,
      p.fecha_inicio,
      p.fecha_fin,
      p.estado,
    ]);
    return r.insertId;
  },
  async actualizar(db: Db, id: number, data: Partial<Periodo>) {
    const set = setClause(data);
    if (!set.sql) return;
    await execute(db, `UPDATE periodo SET ${set.sql} WHERE id_periodo = ?`, [...set.params, id]);
  },
  eliminar(db: Db, id: number) {
    return execute(db, 'DELETE FROM periodo WHERE id_periodo = ?', [id]);
  },
  async contarUso(db: Db, id: number): Promise<{ grupos: number; matriculas: number }> {
    const r = await selectOne<{ grupos: number; matriculas: number }>(
      db,
      `SELECT (SELECT COUNT(*) FROM grupo WHERE id_periodo = ?) AS grupos,
              (SELECT COUNT(*) FROM matricula WHERE id_periodo = ?) AS matriculas`,
      [id, id],
    );
    return { grupos: Number(r?.grupos ?? 0), matriculas: Number(r?.matriculas ?? 0) };
  },
  /** Al cerrar un periodo, las matrículas activas y sus inscripciones se finalizan. */
  async finalizarMatriculas(db: Db, id: number) {
    const detalles = await execute(
      db,
      `UPDATE detalle_matricula dm JOIN matricula m ON m.id_matricula = dm.id_matricula
          SET dm.estado = 'Finalizado'
        WHERE m.id_periodo = ? AND m.estado = 'Activa' AND dm.estado = 'Inscrito'`,
      [id],
    );
    const matriculas = await execute(db, "UPDATE matricula SET estado = 'Finalizada' WHERE id_periodo = ? AND estado = 'Activa'", [id]);
    return { matriculas_finalizadas: matriculas.affectedRows, inscripciones_finalizadas: detalles.affectedRows };
  },
  async contarSinNota(db: Db, id: number): Promise<number> {
    const r = await selectOne<{ total: number }>(
      db,
      `SELECT COUNT(*) AS total FROM detalle_matricula dm
         JOIN matricula m ON m.id_matricula = dm.id_matricula
         LEFT JOIN calificacion c ON c.id_detalle = dm.id_detalle
        WHERE m.id_periodo = ? AND dm.estado = 'Inscrito' AND c.id_detalle IS NULL`,
      [id],
    );
    return Number(r?.total ?? 0);
  },
};
