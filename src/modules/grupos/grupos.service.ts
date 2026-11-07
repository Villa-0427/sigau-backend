/**
 * RF-07 (grupos) y RF-10 (horarios y aulas).
 * Incluye las validaciones de la sección 2.3 que las FK no garantizan:
 *  - sin cruces de horario del mismo grupo, la misma aula o el mismo docente;
 *  - capacidad del aula >= cupo del grupo.
 */
import { businessRule, conflict, notFound } from '../../common/errors';
import { pool, withTransaction, type Db } from '../../db/pool';
import { horaInicioAnterior, normalizarHora, periodoAbierto } from '../../domain/rules';
import type { Grupo } from '../../domain/types';
import { asignaturasRepository } from '../asignaturas/asignaturas.repository';
import { aulasRepository } from '../aulas/aulas.repository';
import { periodosRepository } from '../periodos/periodos.repository';
import { personasRepository } from '../personas/personas.repository';
import { gruposRepository as repo, horariosRepository, type BloqueNuevo, type FiltrosGrupo } from './grupos.repository';
import type { ActualizarGrupoDto, CrearGrupoDto, HorarioDto } from './grupos.schemas';

async function exigirGrupo(db: Db, id: number, bloquear = false): Promise<Grupo> {
  const grupo = await repo.buscarPorId(db, id, bloquear);
  if (!grupo) throw notFound('Grupo', id);
  return grupo;
}

async function exigirPeriodoAbierto(db: Db, idPeriodo: number) {
  const periodo = await periodosRepository.buscarPorId(db, idPeriodo);
  if (!periodo) throw businessRule('RB-06', `El periodo ${idPeriodo} no existe`);
  if (!periodoAbierto(periodo.estado)) throw businessRule('RF-06', `El periodo ${periodo.nombre} está cerrado y no admite cambios`);
  return periodo;
}

async function exigirDocenteActivo(db: Db, idDocente: number) {
  const docente = await personasRepository.obtenerDocente(db, idDocente);
  if (!docente) throw businessRule('RB-06', `La persona ${idDocente} no tiene rol de docente`);
  if (docente.estado !== 'Activo') throw businessRule('RB-06', 'El docente asignado debe estar en estado Activo');
  return docente;
}

function describir(bloques: Array<Record<string, unknown>>) {
  return bloques.map((b) => `${b.codigo_asignatura} ${b.grupo} — ${b.dia_semana} ${b.hora_inicio}-${b.hora_fin} en ${b.aula}`);
}

/** Valida un bloque de horario contra todas las reglas de RF-10 y §2.3. */
async function validarBloque(db: Db, grupo: Grupo, idAula: number, bloque: BloqueNuevo, excluirHorario = 0) {
  if (!horaInicioAnterior(bloque.hora_inicio, bloque.hora_fin)) {
    throw businessRule('RB-11', 'La hora de inicio del bloque debe ser anterior a la hora de finalización');
  }
  const aula = await aulasRepository.buscarPorId(db, idAula);
  if (!aula) throw notFound('Aula', idAula);
  if (aula.capacidad < grupo.cupo) {
    throw businessRule('RB-12', `La capacidad del aula ${aula.codigo} (${aula.capacidad}) es menor que el cupo del grupo (${grupo.cupo})`);
  }
  const mismoGrupo = await horariosRepository.crucesMismoGrupo(db, grupo.id_grupo, bloque, excluirHorario);
  if (mismoGrupo.length) throw businessRule('§2.3', 'El bloque se cruza con otro bloque del mismo grupo', describir(mismoGrupo));

  const mismaAula = await horariosRepository.crucesMismaAula(db, idAula, grupo.id_periodo, bloque, excluirHorario);
  if (mismaAula.length) throw businessRule('§2.3', `El aula ${aula.codigo} ya está ocupada en esa franja`, describir(mismaAula));

  const mismoDocente = await horariosRepository.crucesMismoDocente(db, grupo.id_docente, grupo.id_periodo, bloque, grupo.id_grupo);
  if (mismoDocente.length) throw businessRule('§2.3', 'El docente del grupo ya tiene clase en esa franja', describir(mismoDocente));
}

export const gruposService = {
  listar: (filtros: FiltrosGrupo) => repo.listar(pool, filtros),

  async obtener(id: number) {
    const grupo = await repo.obtenerDetallado(pool, id);
    if (!grupo) throw notFound('Grupo', id);
    return { ...grupo, horarios: await horariosRepository.listarPorGrupo(pool, id) };
  },

  async crear(dto: CrearGrupoDto) {
    const id = await withTransaction(async (conn) => {
      if (!(await asignaturasRepository.buscarPorId(conn, dto.id_asignatura))) {
        throw businessRule('RB-06', `La asignatura ${dto.id_asignatura} no existe`);
      }
      await exigirDocenteActivo(conn, dto.id_docente);
      await exigirPeriodoAbierto(conn, dto.id_periodo);
      if (await repo.buscarPorCodigo(conn, dto.id_periodo, dto.id_asignatura, dto.codigo)) {
        throw conflict(`Ya existe el grupo ${dto.codigo} para esa asignatura en ese periodo`, 'RB-07');
      }
      return repo.insertar(conn, dto);
    });
    return this.obtener(id);
  },

  async actualizar(id: number, dto: ActualizarGrupoDto) {
    await withTransaction(async (conn) => {
      const grupo = await exigirGrupo(conn, id, true);
      await exigirPeriodoAbierto(conn, grupo.id_periodo);

      if (dto.codigo && (await repo.buscarPorCodigo(conn, grupo.id_periodo, grupo.id_asignatura, dto.codigo, id))) {
        throw conflict(`Ya existe el grupo ${dto.codigo} para esa asignatura en ese periodo`, 'RB-07');
      }
      if (dto.cupo !== undefined) {
        const inscritos = await repo.contarInscritos(conn, id);
        if (dto.cupo < inscritos) throw businessRule('RF-07', `El cupo no puede ser menor que los ${inscritos} estudiantes inscritos`);
        const aulaMin = await repo.capacidadMinimaAulas(conn, id);
        if (aulaMin && dto.cupo > aulaMin.capacidad) {
          throw businessRule('RB-12', `El cupo (${dto.cupo}) supera la capacidad del aula ${aulaMin.codigo} (${aulaMin.capacidad}) asignada en su horario`);
        }
      }
      if (dto.id_docente !== undefined && dto.id_docente !== grupo.id_docente) {
        await exigirDocenteActivo(conn, dto.id_docente);
        for (const bloque of await horariosRepository.listarPorGrupo(conn, id)) {
          const cruces = await horariosRepository.crucesMismoDocente(conn, dto.id_docente, grupo.id_periodo, bloque, id);
          if (cruces.length) throw businessRule('§2.3', 'El nuevo docente tiene cruces de horario con este grupo', describir(cruces));
        }
      }
      await repo.actualizar(conn, id, dto);
    });
    return this.obtener(id);
  },

  async eliminar(id: number) {
    await exigirGrupo(pool, id);
    if ((await repo.contarDetalles(pool, id)) > 0) {
      throw conflict('No se puede eliminar el grupo: tiene inscripciones registradas', 'RF-14');
    }
    await repo.eliminar(pool, id); // los horarios se eliminan en cascada
  },

  async estudiantes(id: number) {
    await exigirGrupo(pool, id);
    return repo.estudiantes(pool, id);
  },

  // -------------------------------------------------------------- HORARIOS (RF-10)
  async listarHorarios(idGrupo: number) {
    await exigirGrupo(pool, idGrupo);
    return horariosRepository.listarPorGrupo(pool, idGrupo);
  },

  async agregarHorario(idGrupo: number, dto: HorarioDto) {
    await withTransaction(async (conn) => {
      const grupo = await exigirGrupo(conn, idGrupo, true);
      await exigirPeriodoAbierto(conn, grupo.id_periodo);
      const bloque = { dia_semana: dto.dia_semana, hora_inicio: normalizarHora(dto.hora_inicio), hora_fin: normalizarHora(dto.hora_fin) };
      await validarBloque(conn, grupo, dto.id_aula, bloque);
      await horariosRepository.insertar(conn, { id_grupo: idGrupo, id_aula: dto.id_aula, ...bloque });
    });
    return horariosRepository.listarPorGrupo(pool, idGrupo);
  },

  async actualizarHorario(idGrupo: number, idHorario: number, dto: Partial<HorarioDto>) {
    await withTransaction(async (conn) => {
      const grupo = await exigirGrupo(conn, idGrupo, true);
      await exigirPeriodoAbierto(conn, grupo.id_periodo);
      const actual = await horariosRepository.buscarPorId(conn, idHorario);
      if (!actual || actual.id_grupo !== idGrupo) throw notFound('Horario del grupo', idHorario);
      const nuevo = {
        id_aula: dto.id_aula ?? actual.id_aula,
        dia_semana: dto.dia_semana ?? actual.dia_semana,
        hora_inicio: normalizarHora(dto.hora_inicio ?? actual.hora_inicio),
        hora_fin: normalizarHora(dto.hora_fin ?? actual.hora_fin),
      };
      await validarBloque(conn, grupo, nuevo.id_aula, nuevo, idHorario);
      await horariosRepository.actualizar(conn, idHorario, nuevo);
    });
    return horariosRepository.listarPorGrupo(pool, idGrupo);
  },

  async eliminarHorario(idGrupo: number, idHorario: number) {
    const grupo = await exigirGrupo(pool, idGrupo);
    await exigirPeriodoAbierto(pool, grupo.id_periodo);
    const actual = await horariosRepository.buscarPorId(pool, idHorario);
    if (!actual || actual.id_grupo !== idGrupo) throw notFound('Horario del grupo', idHorario);
    await horariosRepository.eliminar(pool, idHorario);
  },
};
