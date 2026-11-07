/**
 * RF-08 (matrículas), RF-09 (inscripción en grupos) y RF-11 (calificaciones).
 * Aquí se concentra la lógica que la §2.3 indica que NO garantizan las FK:
 * cupo disponible, cumplimiento real de prerrequisitos y cruces de horario del estudiante.
 */
import { businessRule, conflict, notFound } from '../../common/errors';
import { pool, withTransaction, type Db } from '../../db/pool';
import { crucesEntre, esAprobada, hayCupo, hoy, periodoAbierto, transicionMatriculaValida } from '../../domain/rules';
import { asignaturasRepository } from '../asignaturas/asignaturas.repository';
import { gruposRepository, horariosRepository } from '../grupos/grupos.repository';
import { periodosRepository } from '../periodos/periodos.repository';
import { personasRepository } from '../personas/personas.repository';
import { matriculasRepository as repo } from './matriculas.repository';
import type { CalificacionDto, CrearMatriculaDto, InscribirGrupoDto } from './matriculas.schemas';

async function exigirMatricula(db: Db, id: number, bloquear = false) {
  const matricula = await repo.buscarPorId(db, id, bloquear);
  if (!matricula) throw notFound('Matrícula', id);
  return matricula;
}

async function exigirDetalle(db: Db, idDetalle: number) {
  const detalle = await repo.obtenerDetalleContexto(db, idDetalle);
  if (!detalle) throw notFound('Detalle de matrícula', idDetalle);
  return detalle;
}

export const matriculasService = {
  listar: (f: { estudiante?: number; periodo?: number; estado?: string }) => repo.listar(pool, f),

  async obtener(id: number) {
    const matricula = await repo.obtenerDetallada(pool, id);
    if (!matricula) throw notFound('Matrícula', id);
    const detalles = await repo.detalles(pool, id);
    const vigentes = detalles.filter((d) => d.estado !== 'Retirado');
    return {
      ...matricula,
      total_asignaturas: vigentes.length,
      total_creditos: vigentes.reduce((s, d) => s + Number(d.creditos), 0),
      detalles,
    };
  },

  /** RF-08, S-08, RB-08. */
  async crear(dto: CrearMatriculaDto) {
    const id = await withTransaction(async (conn) => {
      const estudiante = await personasRepository.obtenerEstudiante(conn, dto.id_persona_estudiante);
      if (!estudiante) throw businessRule('RB-03', `La persona ${dto.id_persona_estudiante} no tiene rol de estudiante`);
      if (estudiante.estado !== 'Activo') throw businessRule('RF-08', `Sólo un estudiante Activo puede matricularse (estado actual: ${estudiante.estado})`);

      const periodo = await periodosRepository.buscarPorId(conn, dto.id_periodo);
      if (!periodo) throw notFound('Periodo', dto.id_periodo);
      if (!periodoAbierto(periodo.estado)) throw businessRule('RF-08', `El periodo ${periodo.nombre} está cerrado`);

      if (await repo.buscarPorEstudiantePeriodo(conn, dto.id_persona_estudiante, dto.id_periodo)) {
        throw conflict(`El estudiante ya tiene una matrícula en el periodo ${periodo.nombre}`, 'RB-08');
      }
      return repo.insertar(conn, {
        id_persona_estudiante: dto.id_persona_estudiante,
        id_periodo: dto.id_periodo,
        fecha_matricula: dto.fecha_matricula ?? hoy(),
        estado: 'Activa',
      });
    });
    return this.obtener(id);
  },

  /** Activa -> Cancelada (retira las inscripciones) o Activa -> Finalizada. */
  async cambiarEstado(id: number, estado: 'Cancelada' | 'Finalizada') {
    await withTransaction(async (conn) => {
      const matricula = await exigirMatricula(conn, id, true);
      if (!transicionMatriculaValida(matricula.estado, estado)) {
        throw businessRule('RF-08', `Transición inválida: ${matricula.estado} -> ${estado}. Sólo una matrícula Activa puede cancelarse o finalizarse.`);
      }
      if (estado === 'Cancelada') await repo.retirarTodos(conn, id);
      else await repo.finalizarTodos(conn, id);
      await repo.actualizarEstado(conn, id, estado);
    });
    return this.obtener(id);
  },

  async eliminar(id: number) {
    await exigirMatricula(pool, id);
    if ((await repo.contarDetalles(pool, id)) > 0) {
      throw conflict('No se puede eliminar una matrícula con inscripciones; cancélela en su lugar', 'RF-14');
    }
    await repo.eliminar(pool, id);
  },

  // -------------------------------------------------------------- DETALLE (RF-09)
  /**
   * Inscribe la matrícula en un grupo validando, en orden:
   * matrícula activa, coherencia de periodo, duplicidad (RB-09/S-10), asignatura repetida,
   * plan de estudio, asignatura ya aprobada, prerrequisitos (RF-12), cupo y cruces de horario.
   */
  async inscribirGrupo(idMatricula: number, dto: InscribirGrupoDto) {
    const idDetalle = await withTransaction(async (conn) => {
      const matricula = await exigirMatricula(conn, idMatricula, true);
      if (matricula.estado !== 'Activa') throw businessRule('RF-09', `La matrícula está ${matricula.estado}; sólo se inscriben grupos en matrículas Activas`);

      // Bloquea la fila del grupo para que dos inscripciones simultáneas no superen el cupo.
      const grupo = await gruposRepository.buscarPorId(conn, dto.id_grupo, true);
      if (!grupo) throw notFound('Grupo', dto.id_grupo);
      if (grupo.id_periodo !== matricula.id_periodo) {
        throw businessRule('S-06', 'El grupo pertenece a un periodo distinto al de la matrícula');
      }
      const periodo = await periodosRepository.buscarPorId(conn, matricula.id_periodo);
      if (!periodo || !periodoAbierto(periodo.estado)) throw businessRule('RF-09', 'El periodo de la matrícula está cerrado');

      const estudiante = await personasRepository.obtenerEstudiante(conn, matricula.id_persona_estudiante);
      if (!estudiante || estudiante.estado !== 'Activo') throw businessRule('RF-09', 'El estudiante no está Activo');

      const existente = await repo.buscarDetalle(conn, idMatricula, dto.id_grupo);
      if (existente && existente.estado !== 'Retirado') {
        throw conflict('El estudiante ya está inscrito en este grupo', 'RB-09');
      }

      const asignatura = await asignaturasRepository.buscarPorId(conn, grupo.id_asignatura);
      const otra = await repo.asignaturaYaInscrita(conn, idMatricula, grupo.id_asignatura);
      if (otra) throw businessRule('S-10', `El estudiante ya está inscrito en ${asignatura?.codigo} (grupo ${otra.grupo}) en este periodo`);

      if (!(await repo.asignaturaEnPlan(conn, estudiante.id_programa, grupo.id_asignatura))) {
        throw businessRule('RF-05', `La asignatura ${asignatura?.codigo} no pertenece al plan de estudio del programa del estudiante`);
      }
      if (await repo.asignaturaAprobada(conn, matricula.id_persona_estudiante, grupo.id_asignatura)) {
        throw businessRule('RF-09', `El estudiante ya aprobó ${asignatura?.codigo}`);
      }

      const pendientes = await repo.prerrequisitosPendientes(conn, matricula.id_persona_estudiante, grupo.id_asignatura);
      if (pendientes.length) {
        throw businessRule(
          'RF-12',
          `No cumple prerrequisitos para ${asignatura?.codigo}: debe aprobar ${pendientes.map((p) => `${p.codigo} (${p.nombre})`).join(', ')}`,
          pendientes,
        );
      }

      const inscritos = await gruposRepository.contarInscritos(conn, dto.id_grupo);
      if (!hayCupo(grupo.cupo, inscritos)) throw businessRule('RF-07', `El grupo no tiene cupo disponible (${inscritos}/${grupo.cupo})`);

      const bloquesGrupo = await horariosRepository.listarPorGrupo(conn, dto.id_grupo);
      const bloquesEstudiante = await repo.bloquesDelEstudiante(conn, matricula.id_persona_estudiante, matricula.id_periodo);
      const cruces = crucesEntre(bloquesGrupo, bloquesEstudiante);
      if (cruces.length) {
        throw businessRule(
          '§2.3',
          'El horario del grupo se cruza con otros grupos inscritos por el estudiante',
          cruces.map((c) => `${c.nuevo.dia_semana} ${c.nuevo.hora_inicio}-${c.nuevo.hora_fin} choca con ${c.existente.codigo_asignatura} ${c.existente.grupo} (${c.existente.hora_inicio}-${c.existente.hora_fin})`),
        );
      }

      const fecha = dto.fecha_registro ?? hoy();
      if (existente) {
        // Re-inscripción de un grupo del que se había retirado (la UQ matrícula-grupo impide otra fila).
        await repo.actualizarDetalle(conn, existente.id_detalle, 'Inscrito', fecha);
        return existente.id_detalle;
      }
      return repo.insertarDetalle(conn, { id_matricula: idMatricula, id_grupo: dto.id_grupo, fecha_registro: fecha, estado: 'Inscrito' });
    });
    return { id_detalle: idDetalle, matricula: await this.obtener(idMatricula) };
  },

  async retirarDetalle(idDetalle: number) {
    const detalle = await exigirDetalle(pool, idDetalle);
    if (detalle.estado !== 'Inscrito') throw businessRule('RF-09', `Sólo se puede retirar una inscripción en estado Inscrito (actual: ${detalle.estado})`);
    if (!periodoAbierto(detalle.estado_periodo)) throw businessRule('RF-09', 'El periodo está cerrado');
    if (await repo.obtenerCalificacion(pool, idDetalle)) {
      throw businessRule('RF-11', 'No se puede retirar una inscripción que ya tiene calificación final');
    }
    await repo.actualizarDetalle(pool, idDetalle, 'Retirado');
    return this.obtener(detalle.id_matricula);
  },

  // -------------------------------------------------------------- CALIFICACION (RF-11)
  async obtenerCalificacion(idDetalle: number) {
    await exigirDetalle(pool, idDetalle);
    const c = await repo.obtenerCalificacion(pool, idDetalle);
    if (!c) throw notFound('Calificación del detalle', idDetalle);
    return { ...c, aprobada: esAprobada(c.nota_final) };
  },

  /** Registra o corrige la nota final (S-11: a lo sumo una por detalle). */
  async registrarCalificacion(idDetalle: number, dto: CalificacionDto) {
    const detalle = await exigirDetalle(pool, idDetalle);
    if (detalle.estado === 'Retirado') throw businessRule('RF-11', 'No se puede calificar una inscripción retirada');
    if (!periodoAbierto(detalle.estado_periodo)) throw businessRule('RF-11', 'El periodo está cerrado: las notas ya no pueden modificarse');
    const nota = Math.round(dto.nota_final * 100) / 100;
    await repo.guardarCalificacion(pool, {
      id_detalle: idDetalle,
      nota_final: nota,
      fecha_registro: dto.fecha_registro ?? hoy(),
      observacion: dto.observacion ?? null,
    });
    return this.obtenerCalificacion(idDetalle);
  },

  async eliminarCalificacion(idDetalle: number) {
    const detalle = await exigirDetalle(pool, idDetalle);
    if (!periodoAbierto(detalle.estado_periodo)) throw businessRule('RF-11', 'El periodo está cerrado: las notas ya no pueden modificarse');
    if (!(await repo.obtenerCalificacion(pool, idDetalle))) throw notFound('Calificación del detalle', idDetalle);
    await repo.eliminarCalificacion(pool, idDetalle);
  },

  listarCalificaciones: (f: { periodo?: number; grupo?: number; estudiante?: number; asignatura?: number }) => repo.listarCalificaciones(pool, f),
};
