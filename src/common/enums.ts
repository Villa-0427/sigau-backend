/** Listas de dominio (integridad de dominio, sección 4.3). Deben coincidir con los CHECK del esquema. */
export const TIPOS_DOCUMENTO = ['CC', 'TI', 'CE', 'PA'] as const;
export const NIVELES_PROGRAMA = ['Técnico', 'Tecnológico', 'Profesional', 'Especialización', 'Maestría', 'Doctorado'] as const;
export const ESTADOS_ESTUDIANTE = ['Activo', 'Inactivo', 'Graduado', 'Retirado'] as const;
export const ESTADOS_DOCENTE = ['Activo', 'Inactivo'] as const;
export const ESTADOS_PERIODO = ['Planeado', 'Activo', 'Cerrado'] as const;
export const MODALIDADES = ['Presencial', 'Virtual', 'Híbrida'] as const;
export const ESTADOS_MATRICULA = ['Activa', 'Cancelada', 'Finalizada'] as const;
export const ESTADOS_DETALLE = ['Inscrito', 'Retirado', 'Finalizado'] as const;
export const TIPOS_AULA = ['Salón', 'Laboratorio', 'Auditorio', 'Sala de cómputo'] as const;
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

export type EstadoPeriodo = (typeof ESTADOS_PERIODO)[number];
export type EstadoMatricula = (typeof ESTADOS_MATRICULA)[number];

/** Nota mínima para aprobar una asignatura (escala 0.00–5.00). */
export const NOTA_APROBATORIA = 3.0;
