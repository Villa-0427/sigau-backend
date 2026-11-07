import { z } from 'zod';
import { ESTADOS_PERIODO } from '../../common/enums';
import { fechaSchema, textoRequerido } from '../../common/zod';

/** RF-06: periodo con fechas de inicio y fin. Un periodo nuevo no puede nacer Cerrado. */
export const crearPeriodoSchema = z.object({
  nombre: textoRequerido(40),
  fecha_inicio: fechaSchema,
  fecha_fin: fechaSchema,
  estado: z.enum(['Planeado', 'Activo']).default('Planeado'),
});
export const actualizarPeriodoSchema = crearPeriodoSchema.omit({ estado: true }).partial();
export const cambiarEstadoPeriodoSchema = z.object({ estado: z.enum(ESTADOS_PERIODO) });

export type CrearPeriodoDto = z.infer<typeof crearPeriodoSchema>;
export type ActualizarPeriodoDto = z.infer<typeof actualizarPeriodoSchema>;
