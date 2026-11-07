/** Esquemas zod reutilizables para validar la entrada (integridad de dominio). */
import { z } from 'zod';

export const idSchema = z.coerce.number().int().positive();

export const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha esperado: YYYY-MM-DD')
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Fecha inválida');

export const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Formato de hora esperado: HH:MM');

export const textoRequerido = (max: number) => z.string().trim().min(1, 'Requerido').max(max);
export const textoOpcional = (max: number) => z.string().trim().max(max).nullish();
