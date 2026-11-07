import { z } from 'zod';
import { DIAS_SEMANA, MODALIDADES } from '../../common/enums';
import { horaSchema, idSchema } from '../../common/zod';

const codigoGrupo = z
  .string()
  .trim()
  .min(1)
  .max(15)
  .regex(/^[A-Za-z0-9-]+$/, 'Sólo letras, números y guiones')
  .transform((c) => c.toUpperCase());

/** RF-07: abrir un grupo de una asignatura para un periodo, con docente y cupo. */
export const crearGrupoSchema = z.object({
  id_asignatura: idSchema,
  id_docente: idSchema,
  id_periodo: idSchema,
  codigo: codigoGrupo,
  cupo: z.coerce.number().int().positive('RB-12: el cupo debe ser mayor que cero').max(65535),
  modalidad: z.enum(MODALIDADES),
});

/** La asignatura y el periodo de un grupo no cambian; para eso se abre otro grupo. */
export const actualizarGrupoSchema = crearGrupoSchema.omit({ id_asignatura: true, id_periodo: true }).partial();

/** RF-10: bloque de horario en un aula. */
export const horarioSchema = z.object({
  id_aula: idSchema,
  dia_semana: z.enum(DIAS_SEMANA),
  hora_inicio: horaSchema,
  hora_fin: horaSchema,
});
export const actualizarHorarioSchema = horarioSchema.partial();

export type CrearGrupoDto = z.infer<typeof crearGrupoSchema>;
export type ActualizarGrupoDto = z.infer<typeof actualizarGrupoSchema>;
export type HorarioDto = z.infer<typeof horarioSchema>;
