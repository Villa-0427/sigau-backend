/**
 * Lógica de negocio de PERSONA y sus subtipos ESTUDIANTE / DOCENTE.
 * Especialización total y solapada (sección 3.3): toda persona tiene al menos un rol
 * y puede tener ambos. Esa condición no la garantizan las FK, se controla aquí.
 */
import { businessRule, conflict, notFound } from '../../common/errors';
import { pool, withTransaction, type Db } from '../../db/pool';
import { programasRepository } from '../programas/programas.repository';
import { personasRepository as repo } from './personas.repository';
import type { ActualizarPersonaDto, CrearPersonaDto, DocenteDto, EstudianteDto } from './personas.schemas';

async function validarUnicidad(db: Db, datos: { tipo_documento: string; numero_documento: string; email: string }, excluirId = 0) {
  if (await repo.buscarPorDocumento(db, datos.tipo_documento, datos.numero_documento, excluirId)) {
    throw conflict(`Ya existe una persona con documento ${datos.tipo_documento} ${datos.numero_documento}`, 'RB-01');
  }
  if (await repo.buscarPorEmail(db, datos.email, excluirId)) {
    throw conflict(`El correo ${datos.email} ya está registrado`, 'RB-02');
  }
}

async function validarPrograma(db: Db, idPrograma: number) {
  if (!(await programasRepository.buscarPorId(db, idPrograma))) {
    throw businessRule('RB-03', `Todo estudiante debe estar asociado a un programa existente (programa ${idPrograma} no existe)`);
  }
}

async function exigirPersona(db: Db, id: number) {
  const persona = await repo.buscarPorId(db, id);
  if (!persona) throw notFound('Persona', id);
  return persona;
}

export const personasService = {
  listar(filtros: { rol?: 'estudiante' | 'docente'; texto?: string }) {
    return repo.listar(pool, filtros);
  },

  async obtener(id: number) {
    const persona = await repo.obtenerConRoles(pool, id);
    if (!persona) throw notFound('Persona', id);
    return persona;
  },

  /** RF-01, RF-02: registra la persona y sus roles en una sola transacción. */
  async crear(dto: CrearPersonaDto) {
    const id = await withTransaction(async (conn) => {
      await validarUnicidad(conn, dto);
      if (dto.estudiante) await validarPrograma(conn, dto.estudiante.id_programa);

      const idPersona = await repo.insertar(conn, {
        tipo_documento: dto.tipo_documento,
        numero_documento: dto.numero_documento,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        email: dto.email,
        telefono: dto.telefono ?? null,
      });
      if (dto.estudiante) await repo.insertarEstudiante(conn, { id_persona: idPersona, ...dto.estudiante });
      if (dto.docente) await repo.insertarDocente(conn, { id_persona: idPersona, especialidad: dto.docente.especialidad ?? null, estado: dto.docente.estado });
      return idPersona;
    });
    return this.obtener(id);
  },

  async actualizar(id: number, dto: ActualizarPersonaDto) {
    await withTransaction(async (conn) => {
      const actual = await exigirPersona(conn, id);
      const combinado = { ...actual, ...dto };
      await validarUnicidad(conn, combinado, id);
      await repo.actualizar(conn, id, dto);
    });
    return this.obtener(id);
  },

  async eliminar(id: number) {
    await exigirPersona(pool, id);
    if ((await repo.contarMatriculas(pool, id)) > 0) {
      throw conflict('No se puede eliminar: la persona tiene matrículas registradas (historial académico)', 'RF-14');
    }
    if ((await repo.contarGrupos(pool, id)) > 0) {
      throw conflict('No se puede eliminar: la persona tiene grupos asignados como docente', 'RF-14');
    }
    await repo.eliminar(pool, id); // ESTUDIANTE y DOCENTE se borran en cascada
  },

  // -------------------------------------------------------------- Rol ESTUDIANTE
  async agregarRolEstudiante(id: number, dto: EstudianteDto) {
    await withTransaction(async (conn) => {
      await exigirPersona(conn, id);
      if (await repo.obtenerEstudiante(conn, id)) throw conflict('La persona ya tiene el rol de estudiante', 'S-02');
      await validarPrograma(conn, dto.id_programa);
      await repo.insertarEstudiante(conn, { id_persona: id, ...dto });
    });
    return this.obtener(id);
  },

  async actualizarEstudiante(id: number, dto: Partial<EstudianteDto>) {
    await withTransaction(async (conn) => {
      if (!(await repo.obtenerEstudiante(conn, id))) throw notFound('Estudiante', id);
      if (dto.id_programa !== undefined) await validarPrograma(conn, dto.id_programa);
      await repo.actualizarEstudiante(conn, id, dto);
    });
    return this.obtener(id);
  },

  async quitarRolEstudiante(id: number) {
    await withTransaction(async (conn) => {
      if (!(await repo.obtenerEstudiante(conn, id))) throw notFound('Estudiante', id);
      if (!(await repo.obtenerDocente(conn, id))) {
        throw businessRule('S-02', 'No se puede quitar el único rol: la especialización es total (la persona quedaría sin rol). Elimine la persona en su lugar.');
      }
      if ((await repo.contarMatriculas(conn, id)) > 0) {
        throw conflict('No se puede quitar el rol de estudiante: tiene matrículas registradas', 'RF-14');
      }
      await repo.eliminarEstudiante(conn, id);
    });
    return this.obtener(id);
  },

  // -------------------------------------------------------------- Rol DOCENTE
  async agregarRolDocente(id: number, dto: DocenteDto) {
    await withTransaction(async (conn) => {
      await exigirPersona(conn, id);
      if (await repo.obtenerDocente(conn, id)) throw conflict('La persona ya tiene el rol de docente', 'S-02');
      await repo.insertarDocente(conn, { id_persona: id, especialidad: dto.especialidad ?? null, estado: dto.estado });
    });
    return this.obtener(id);
  },

  async actualizarDocente(id: number, dto: Partial<DocenteDto>) {
    await withTransaction(async (conn) => {
      if (!(await repo.obtenerDocente(conn, id))) throw notFound('Docente', id);
      if (dto.estado === 'Inactivo' && (await repo.contarGrupos(conn, id, true)) > 0) {
        throw businessRule('RB-06', 'No se puede inactivar al docente: tiene grupos asignados en periodos no cerrados. Reasigne esos grupos primero.');
      }
      await repo.actualizarDocente(conn, id, dto);
    });
    return this.obtener(id);
  },

  async quitarRolDocente(id: number) {
    await withTransaction(async (conn) => {
      if (!(await repo.obtenerDocente(conn, id))) throw notFound('Docente', id);
      if (!(await repo.obtenerEstudiante(conn, id))) {
        throw businessRule('S-02', 'No se puede quitar el único rol: la especialización es total (la persona quedaría sin rol). Elimine la persona en su lugar.');
      }
      if ((await repo.contarGrupos(conn, id)) > 0) {
        throw conflict('No se puede quitar el rol de docente: tiene grupos asignados', 'RB-06');
      }
      await repo.eliminarDocente(conn, id);
    });
    return this.obtener(id);
  },
};
