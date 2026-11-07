/** RF-06: periodos académicos. */
import { ESTADOS_PERIODO, type EstadoPeriodo } from '../../common/enums';
import { businessRule, conflict, notFound } from '../../common/errors';
import { pool, withTransaction, type Db } from '../../db/pool';
import { fechasCoherentes, transicionPeriodoValida } from '../../domain/rules';
import { gruposRepository, horariosRepository } from '../grupos/grupos.repository';
import { periodosRepository as repo } from './periodos.repository';
import type { ActualizarPeriodoDto, CrearPeriodoDto } from './periodos.schemas';

async function exigirPeriodo(db: Db, id: number) {
  const periodo = await repo.buscarPorId(db, id);
  if (!periodo) throw notFound('Periodo', id);
  return periodo;
}

async function validarFechas(db: Db, inicio: string, fin: string, excluirId = 0) {
  if (!fechasCoherentes(inicio, fin)) throw businessRule('S-14', 'La fecha de inicio del periodo debe ser menor que la fecha de fin');
  const traslapados = await repo.traslapados(db, inicio, fin, excluirId);
  if (traslapados.length) {
    throw businessRule('S-14', `Las fechas se traslapan con el periodo ${traslapados.map((p) => p.nombre).join(', ')}`);
  }
}

export const periodosService = {
  listar: (estado?: string) => repo.listar(pool, estado),

  obtener: (id: number) => exigirPeriodo(pool, id),

  async crear(dto: CrearPeriodoDto) {
    if (await repo.buscarPorNombre(pool, dto.nombre)) throw conflict(`Ya existe el periodo ${dto.nombre}`);
    await validarFechas(pool, dto.fecha_inicio, dto.fecha_fin);
    const id = await repo.insertar(pool, dto);
    return exigirPeriodo(pool, id);
  },

  async actualizar(id: number, dto: ActualizarPeriodoDto) {
    const actual = await exigirPeriodo(pool, id);
    if (actual.estado === 'Cerrado') throw businessRule('RF-06', 'Un periodo cerrado no puede modificarse');
    if (dto.nombre && (await repo.buscarPorNombre(pool, dto.nombre, id))) throw conflict(`Ya existe el periodo ${dto.nombre}`);
    await validarFechas(pool, dto.fecha_inicio ?? actual.fecha_inicio, dto.fecha_fin ?? actual.fecha_fin, id);
    await repo.actualizar(pool, id, dto);
    return exigirPeriodo(pool, id);
  },

  /** Planeado -> Activo -> Cerrado. Al cerrar, se finalizan matrículas e inscripciones. */
  async cambiarEstado(id: number, nuevo: EstadoPeriodo) {
    return withTransaction(async (conn) => {
      const actual = await exigirPeriodo(conn, id);
      if (!transicionPeriodoValida(actual.estado as EstadoPeriodo, nuevo)) {
        throw businessRule('RF-06', `Transición inválida: ${actual.estado} -> ${nuevo}. Orden permitido: ${ESTADOS_PERIODO.join(' -> ')}`);
      }
      let resumen = {};
      if (nuevo === 'Cerrado') {
        const sinNota = await repo.contarSinNota(conn, id);
        resumen = { ...(await repo.finalizarMatriculas(conn, id)), inscripciones_sin_nota: sinNota };
      }
      await repo.actualizar(conn, id, { estado: nuevo });
      return { ...(await exigirPeriodo(conn, id)), ...resumen };
    });
  },

  async eliminar(id: number) {
    await exigirPeriodo(pool, id);
    const uso = await repo.contarUso(pool, id);
    if (uso.grupos > 0 || uso.matriculas > 0) {
      throw conflict(`No se puede eliminar: el periodo tiene ${uso.grupos} grupos y ${uso.matriculas} matrículas`, 'RF-14');
    }
    await repo.eliminar(pool, id);
  },

  /** RF-13: oferta académica del periodo (grupos con su horario y cupo disponible). */
  async oferta(id: number) {
    const periodo = await exigirPeriodo(pool, id);
    const grupos = await gruposRepository.listar(pool, { periodo: id });
    const conHorario = await Promise.all(
      grupos.map(async (g) => ({ ...g, horarios: await horariosRepository.listarPorGrupo(pool, g.id_grupo) })),
    );
    return { periodo, grupos: conHorario };
  },
};
