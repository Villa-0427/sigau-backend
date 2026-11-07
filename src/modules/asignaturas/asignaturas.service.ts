/** RF-04 (asignaturas) y RF-12 (prerrequisitos). */
import { businessRule, conflict, notFound } from '../../common/errors';
import { pool, withTransaction, type Db } from '../../db/pool';
import { creaCiclo } from '../../domain/rules';
import { gruposRepository } from '../grupos/grupos.repository';
import { asignaturasRepository as repo } from './asignaturas.repository';
import type { AsignaturaDto } from './asignaturas.schemas';

async function exigirAsignatura(db: Db, id: number) {
  const asignatura = await repo.buscarPorId(db, id);
  if (!asignatura) throw notFound('Asignatura', id);
  return asignatura;
}

export const asignaturasService = {
  listar: (filtros: { creditosMin?: number; texto?: string }) => repo.listar(pool, filtros),

  async obtener(id: number) {
    const asignatura = await exigirAsignatura(pool, id);
    const [prerrequisitos, es_prerrequisito_de, programas] = await Promise.all([
      repo.requisitosDe(pool, id),
      repo.esRequisitoDe(pool, id),
      repo.programasQueLaIncluyen(pool, id),
    ]);
    return { ...asignatura, prerrequisitos, es_prerrequisito_de, programas };
  },

  async crear(dto: AsignaturaDto) {
    if (await repo.buscarPorCodigo(pool, dto.codigo)) throw conflict(`Ya existe una asignatura con código ${dto.codigo}`, 'S-04');
    const id = await repo.insertar(pool, dto);
    return this.obtener(id);
  },

  async actualizar(id: number, dto: Partial<AsignaturaDto>) {
    await exigirAsignatura(pool, id);
    if (dto.codigo && (await repo.buscarPorCodigo(pool, dto.codigo, id))) throw conflict(`Ya existe una asignatura con código ${dto.codigo}`, 'S-04');
    await repo.actualizar(pool, id, dto);
    return this.obtener(id);
  },

  async eliminar(id: number) {
    await withTransaction(async (conn) => {
      await exigirAsignatura(conn, id);
      if ((await repo.contarGrupos(conn, id)) > 0) throw conflict('No se puede eliminar: la asignatura tiene grupos abiertos o históricos', 'RB-06');
      await repo.eliminarPrerrequisitosDe(conn, id);
      await repo.eliminar(conn, id); // el plan de estudio se borra en cascada
    });
  },

  // -------------------------------------------------------------- PRERREQUISITOS
  async listarPrerrequisitos(id: number) {
    await exigirAsignatura(pool, id);
    return { requiere: await repo.requisitosDe(pool, id), es_requisito_de: await repo.esRequisitoDe(pool, id) };
  },

  async agregarPrerrequisito(id: number, idRequerida: number) {
    await withTransaction(async (conn) => {
      if (id === idRequerida) throw businessRule('RB-13', 'Una asignatura no puede ser prerrequisito de sí misma');
      await exigirAsignatura(conn, id);
      await exigirAsignatura(conn, idRequerida);
      if (await repo.obtenerPrerrequisito(conn, id, idRequerida)) throw conflict('El prerrequisito ya está registrado', 'RB-13');
      const aristas = await repo.todosLosPrerrequisitos(conn);
      if (creaCiclo(aristas, id, idRequerida)) {
        throw businessRule('RB-13', 'El prerrequisito crearía una dependencia circular entre asignaturas');
      }
      await repo.insertarPrerrequisito(conn, id, idRequerida);
    });
    return this.listarPrerrequisitos(id);
  },

  async quitarPrerrequisito(id: number, idRequerida: number) {
    if (!(await repo.obtenerPrerrequisito(pool, id, idRequerida))) throw notFound('Prerrequisito');
    await repo.eliminarPrerrequisito(pool, id, idRequerida);
  },

  /** RF-13: grupos por asignatura (opcionalmente de un periodo). */
  async grupos(id: number, idPeriodo?: number) {
    await exigirAsignatura(pool, id);
    return gruposRepository.listar(pool, { asignatura: id, periodo: idPeriodo });
  },
};
