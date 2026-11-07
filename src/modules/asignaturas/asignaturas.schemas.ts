import { z } from 'zod';
import { idSchema, textoRequerido } from '../../common/zod';

/** RF-04 / S-04: código único, nombre y créditos enteros mayores que cero. */
export const asignaturaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, 'Sólo letras, números y guiones')
    .transform((c) => c.toUpperCase()),
  nombre: textoRequerido(120),
  creditos: z.coerce.number().int('S-04: los créditos deben ser enteros').positive('S-04: los créditos deben ser mayores que cero').max(255),
});
export const actualizarAsignaturaSchema = asignaturaSchema.partial();

export const prerrequisitoSchema = z.object({ id_asignatura_requerida: idSchema });

export type AsignaturaDto = z.infer<typeof asignaturaSchema>;
