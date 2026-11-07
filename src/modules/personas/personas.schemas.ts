import { z } from 'zod';
import { ESTADOS_DOCENTE, ESTADOS_ESTUDIANTE, TIPOS_DOCUMENTO } from '../../common/enums';
import { fechaSchema, idSchema, textoOpcional, textoRequerido } from '../../common/zod';

export const estudianteSchema = z.object({
  id_programa: idSchema,
  fecha_ingreso: fechaSchema,
  estado: z.enum(ESTADOS_ESTUDIANTE).default('Activo'),
});

export const docenteSchema = z.object({
  especialidad: textoOpcional(120),
  estado: z.enum(ESTADOS_DOCENTE).default('Activo'),
});

const personaBase = z.object({
  tipo_documento: z.enum(TIPOS_DOCUMENTO),
  numero_documento: z
    .string()
    .trim()
    .min(3)
    .max(25)
    .regex(/^[A-Za-z0-9-]+$/, 'Sólo letras, números y guiones'),
  nombres: textoRequerido(80),
  apellidos: textoRequerido(80),
  email: z.string().trim().toLowerCase().email('Correo inválido').max(120),
  telefono: textoOpcional(25),
});

/** RF-01 + RF-02: una persona se registra junto con al menos uno de sus roles (especialización total). */
export const crearPersonaSchema = personaBase
  .extend({ estudiante: estudianteSchema.optional(), docente: docenteSchema.optional() })
  .refine((d) => d.estudiante !== undefined || d.docente !== undefined, {
    message: 'EER/S-02: toda persona debe tener al menos un rol (estudiante y/o docente)',
    path: ['estudiante'],
  });

export const actualizarPersonaSchema = personaBase.partial();
export const actualizarEstudianteSchema = estudianteSchema.partial();
export const actualizarDocenteSchema = docenteSchema.partial();

export type CrearPersonaDto = z.infer<typeof crearPersonaSchema>;
export type ActualizarPersonaDto = z.infer<typeof actualizarPersonaSchema>;
export type EstudianteDto = z.infer<typeof estudianteSchema>;
export type DocenteDto = z.infer<typeof docenteSchema>;
