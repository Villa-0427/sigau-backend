/** Aulas (RF-10) y consulta de horarios por aula (RF-13). */
import { businessRule, conflict, notFound } from '../../common/errors';
import { pool, type Db } from '../../db/pool';
import { horariosRepository } from '../grupos/grupos.repository';
import { aulasRepository as repo } from './aulas.repository';
import type { AulaDto } from './aulas.schemas';

async function exigirAula(db: Db, id: number) {
  const aula = await repo.buscarPorId(db, id);
  if (!aula) throw notFound('Aula', id);
  return aula;
}

export const aulasService = {
  listar: (filtros: { tipo?: string; capacidadMin?: number }) => repo.listar(pool, filtros),
  obtener: (id: number) => exigirAula(pool, id),

  async crear(dto: AulaDto) {
    if (await repo.buscarPorCodigo(pool, dto.codigo)) throw conflict(`Ya existe un aula con código ${dto.codigo}`);
    const id = await repo.insertar(pool, dto);
    return exigirAula(pool, id);
  },

  async actualizar(id: number, dto: Partial<AulaDto>) {
    await exigirAula(pool, id);
    if (dto.codigo && (await repo.buscarPorCodigo(pool, dto.codigo, id))) throw conflict(`Ya existe un aula con código ${dto.codigo}`);
    if (dto.capacidad !== undefined) {
      const mayorCupo = await repo.mayorCupoProgramado(pool, id);
      if (dto.capacidad < mayorCupo) {
        throw businessRule('RB-12', `La nueva capacidad (${dto.capacidad}) es menor que el cupo de un grupo programado en el aula (${mayorCupo})`);
      }
    }
    await repo.actualizar(pool, id, dto);
    return exigirAula(pool, id);
  },

  async eliminar(id: number) {
    await exigirAula(pool, id);
    if ((await repo.contarHorarios(pool, id)) > 0) throw conflict('No se puede eliminar: el aula tiene horarios asignados', 'RF-14');
    await repo.eliminar(pool, id);
  },

  async horarios(id: number, idPeriodo?: number) {
    const aula = await exigirAula(pool, id);
    return { aula, horarios: await horariosRepository.listarPorAula(pool, id, idPeriodo) };
  },
};
