import { execute, select, selectOne, setClause, type Db } from '../../db/pool';
import type { PlanEstudio, Programa } from '../../domain/types';

export const programasRepository = {
  listar(db: Db) {
    return select<Programa & { total_estudiantes: number }>(
      db,
      `SELECT pr.*, (SELECT COUNT(*) FROM estudiante e WHERE e.id_programa = pr.id_programa) AS total_estudiantes
         FROM programa pr ORDER BY pr.nombre`,
    );
  },
  buscarPorId(db: Db, id: number) {
    return selectOne<Programa>(db, 'SELECT * FROM programa WHERE id_programa = ?', [id]);
  },
  buscarPorNombre(db: Db, nombre: string, excluirId = 0) {
    return selectOne<Programa>(db, 'SELECT * FROM programa WHERE nombre = ? AND id_programa <> ?', [nombre, excluirId]);
  },
  async insertar(db: Db, p: Omit<Programa, 'id_programa'>): Promise<number> {
    const r = await execute(db, 'INSERT INTO programa (nombre, facultad, nivel) VALUES (?, ?, ?)', [p.nombre, p.facultad, p.nivel]);
    return r.insertId;
  },
  async actualizar(db: Db, id: number, data: Partial<Programa>) {
    const set = setClause(data);
    if (!set.sql) return;
    await execute(db, `UPDATE programa SET ${set.sql} WHERE id_programa = ?`, [...set.params, id]);
  },
  eliminar(db: Db, id: number) {
    return execute(db, 'DELETE FROM programa WHERE id_programa = ?', [id]);
  },
  async contarEstudiantes(db: Db, id: number): Promise<number> {
    const r = await selectOne<{ total: number }>(db, 'SELECT COUNT(*) AS total FROM estudiante WHERE id_programa = ?', [id]);
    return Number(r?.total ?? 0);
  },

  // ----- PLAN_ESTUDIO -----
  listarPlan(db: Db, idPrograma: number) {
    return select<Record<string, unknown>>(
      db,
      `SELECT pe.id_programa, pe.id_asignatura, a.codigo, a.nombre, a.creditos, pe.semestre, pe.obligatoria
         FROM plan_estudio pe JOIN asignatura a ON a.id_asignatura = pe.id_asignatura
        WHERE pe.id_programa = ?
        ORDER BY pe.semestre, a.codigo`,
      [idPrograma],
    );
  },
  obtenerItemPlan(db: Db, idPrograma: number, idAsignatura: number) {
    return selectOne<PlanEstudio>(db, 'SELECT * FROM plan_estudio WHERE id_programa = ? AND id_asignatura = ?', [idPrograma, idAsignatura]);
  },
  insertarItemPlan(db: Db, p: PlanEstudio) {
    return execute(db, 'INSERT INTO plan_estudio (id_programa, id_asignatura, semestre, obligatoria) VALUES (?, ?, ?, ?)', [
      p.id_programa,
      p.id_asignatura,
      p.semestre,
      p.obligatoria,
    ]);
  },
  async actualizarItemPlan(db: Db, idPrograma: number, idAsignatura: number, data: Partial<PlanEstudio>) {
    const set = setClause(data);
    if (!set.sql) return;
    await execute(db, `UPDATE plan_estudio SET ${set.sql} WHERE id_programa = ? AND id_asignatura = ?`, [...set.params, idPrograma, idAsignatura]);
  },
  eliminarItemPlan(db: Db, idPrograma: number, idAsignatura: number) {
    return execute(db, 'DELETE FROM plan_estudio WHERE id_programa = ? AND id_asignatura = ?', [idPrograma, idAsignatura]);
  },
  /** Inscripciones vigentes de estudiantes del programa en la asignatura (para no romper la coherencia del plan). */
  async contarInscritosVigentes(db: Db, idPrograma: number, idAsignatura: number): Promise<number> {
    const r = await selectOne<{ total: number }>(
      db,
      `SELECT COUNT(*) AS total
         FROM detalle_matricula dm
         JOIN matricula m  ON m.id_matricula = dm.id_matricula
         JOIN estudiante e ON e.id_persona = m.id_persona_estudiante
         JOIN grupo g      ON g.id_grupo = dm.id_grupo
        WHERE e.id_programa = ? AND g.id_asignatura = ? AND dm.estado = 'Inscrito'`,
      [idPrograma, idAsignatura],
    );
    return Number(r?.total ?? 0);
  },
};
