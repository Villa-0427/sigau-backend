import { z } from 'zod';
import { fechaSchema, idSchema, textoOpcional } from '../../common/zod';
import { notaValida } from '../../domain/rules';

/** RF-08: matrícula (cabecera) de un estudiante en un periodo. */
export const crearMatriculaSchema = z.object({
  id_persona_estudiante: idSchema,
  id_periodo: idSchema,
  fecha_matricula: fechaSchema.optional(),
});

export const cambiarEstadoMatriculaSchema = z.object({ estado: z.enum(['Cancelada', 'Finalizada']) });

/** RF-09: inscripción de la matrícula en un grupo. */
export const inscribirGrupoSchema = z.object({
  id_grupo: idSchema,
  fecha_registro: fechaSchema.optional(),
});

/** RF-11, RB-10, S-12: nota final 0.00–5.00 con dos decimales. */
export const calificacionSchema = z.object({
  nota_final: z.coerce
    .number()
    .refine(notaValida, 'RB-10/S-12: la nota debe estar entre 0.00 y 5.00 y tener máximo dos decimales'),
  fecha_registro: fechaSchema.optional(),
  observacion: textoOpcional(250),
});

export type CrearMatriculaDto = z.infer<typeof crearMatriculaSchema>;
export type InscribirGrupoDto = z.infer<typeof inscribirGrupoSchema>;
export type CalificacionDto = z.infer<typeof calificacionSchema>;
