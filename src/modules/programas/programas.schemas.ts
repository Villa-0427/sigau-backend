import { z } from 'zod';
import { NIVELES_PROGRAMA } from '../../common/enums';
import { idSchema, textoRequerido } from '../../common/zod';

export const programaSchema = z.object({
  nombre: textoRequerido(120),
  facultad: textoRequerido(120),
  nivel: z.enum(NIVELES_PROGRAMA),
});
export const actualizarProgramaSchema = programaSchema.partial();

/** RB-05: semestre sugerido entero positivo. */
export const itemPlanSchema = z.object({
  id_asignatura: idSchema,
  semestre: z.coerce.number().int().positive('RB-05: el semestre debe ser un entero positivo').max(20),
  obligatoria: z.boolean().default(true),
});
export const actualizarItemPlanSchema = itemPlanSchema.omit({ id_asignatura: true }).partial();

export type ProgramaDto = z.infer<typeof programaSchema>;
export type ItemPlanDto = z.infer<typeof itemPlanSchema>;
