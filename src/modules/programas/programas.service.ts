/** RF-03 (programas) y RF-05 (plan de estudio). */
import { businessRule, conflict, notFound } from '../../common/errors';
import { pool, withTransaction, type Db } from '../../db/pool';
import { asignaturasRepository } from '../asignaturas/asignaturas.repository';
import { programasRepository as repo } from './programas.repository';
import type { ItemPlanDto, ProgramaDto } from './programas.schemas';

async function exigirPrograma(db: Db, id: number) {
  const programa = await repo.buscarPorId(db, id);
  if (!programa) throw notFound('Programa', id);
  return programa;
}

export const programasService = {
  listar: () => repo.listar(pool),

  async obtener(id: number) {
    const programa = await exigirPrograma(pool, id);
    return { ...programa, plan_estudio: await repo.listarPlan(pool, id) };
  },

  async crear(dto: ProgramaDto) {
    if (await repo.buscarPorNombre(pool, dto.nombre)) throw conflict(`Ya existe el programa '${dto.nombre}'`);
    const id = await repo.insertar(pool, dto);
    return this.obtener(id);
  },

  async actualizar(id: number, dto: Partial<ProgramaDto>) {
    await exigirPrograma(pool, id);
    if (dto.nombre && (await repo.buscarPorNombre(pool, dto.nombre, id))) throw conflict(`Ya existe el programa '${dto.nombre}'`);
    await repo.actualizar(pool, id, dto);
    return this.obtener(id);
  },

  async eliminar(id: number) {
    await exigirPrograma(pool, id);
    if ((await repo.contarEstudiantes(pool, id)) > 0) {
      throw conflict('No se puede eliminar el programa: tiene estudiantes asociados', 'RB-03');
    }
    await repo.eliminar(pool, id); // el plan de estudio se borra en cascada
  },

  // -------------------------------------------------------------- PLAN_ESTUDIO
  async listarPlan(idPrograma: number) {
    await exigirPrograma(pool, idPrograma);
    return repo.listarPlan(pool, idPrograma);
  },

  async agregarAsignaturaAlPlan(idPrograma: number, dto: ItemPlanDto) {
    await withTransaction(async (conn) => {
      await exigirPrograma(conn, idPrograma);
      if (!(await asignaturasRepository.buscarPorId(conn, dto.id_asignatura))) throw notFound('Asignatura', dto.id_asignatura);
      if (await repo.obtenerItemPlan(conn, idPrograma, dto.id_asignatura)) {
        throw conflict('La asignatura ya pertenece al plan de estudio de este programa', 'RB-04');
      }
      await repo.insertarItemPlan(conn, { id_programa: idPrograma, ...dto });
    });
    return repo.listarPlan(pool, idPrograma);
  },

  async actualizarItemPlan(idPrograma: number, idAsignatura: number, dto: Partial<Omit<ItemPlanDto, 'id_asignatura'>>) {
    if (!(await repo.obtenerItemPlan(pool, idPrograma, idAsignatura))) throw notFound('Asignatura en el plan de estudio');
    await repo.actualizarItemPlan(pool, idPrograma, idAsignatura, dto);
    return repo.listarPlan(pool, idPrograma);
  },

  async quitarAsignaturaDelPlan(idPrograma: number, idAsignatura: number) {
    if (!(await repo.obtenerItemPlan(pool, idPrograma, idAsignatura))) throw notFound('Asignatura en el plan de estudio');
    if ((await repo.contarInscritosVigentes(pool, idPrograma, idAsignatura)) > 0) {
      throw businessRule('RF-05', 'No se puede quitar del plan: hay estudiantes del programa inscritos actualmente en esa asignatura');
    }
    await repo.eliminarItemPlan(pool, idPrograma, idAsignatura);
  },
};
