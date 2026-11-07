import { z } from 'zod';
import { TIPOS_AULA } from '../../common/enums';

export const aulaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .transform((c) => c.toUpperCase()),
  capacidad: z.coerce.number().int().positive('RB-12: la capacidad del aula debe ser mayor que cero').max(65535),
  tipo: z.enum(TIPOS_AULA),
});
export const actualizarAulaSchema = aulaSchema.partial();

export type AulaDto = z.infer<typeof aulaSchema>;
