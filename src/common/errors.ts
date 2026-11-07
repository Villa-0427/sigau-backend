/**
 * Errores de aplicación. Cada error de negocio indica la regla (RB-xx, S-xx, RF-xx)
 * del documento de Fase 1 que se está haciendo cumplir.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly regla?: string,
    public readonly detalles?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (mensaje: string, regla?: string, detalles?: unknown) =>
  new AppError(400, mensaje, regla, detalles);

export const notFound = (entidad: string, id?: unknown) =>
  new AppError(404, `${entidad}${id !== undefined ? ` con id ${id}` : ''} no existe`);

/** Violación de unicidad (duplicados). */
export const conflict = (mensaje: string, regla?: string, detalles?: unknown) =>
  new AppError(409, mensaje, regla, detalles);

/** Violación de una regla de negocio. */
export const businessRule = (regla: string, mensaje: string, detalles?: unknown) =>
  new AppError(422, mensaje, regla, detalles);

interface MysqlError {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

/** Traduce errores del RDBMS a errores de aplicación con mensajes claros. */
export function fromMysqlError(err: unknown): AppError | undefined {
  const e = err as MysqlError;
  if (!e || typeof e.code !== 'string') return undefined;
  switch (e.code) {
    case 'ER_DUP_ENTRY':
      return conflict(`Registro duplicado: ${e.sqlMessage}`, 'RF-14');
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return badRequest('Se hace referencia a un registro que no existe (integridad referencial)', 'RF-14');
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return conflict('No se puede eliminar: el registro está referenciado por otros datos (integridad referencial)', 'RF-14');
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return badRequest(`Restricción de dominio violada: ${e.sqlMessage}`);
    case 'ECONNREFUSED':
    case 'ER_ACCESS_DENIED_ERROR':
    case 'ER_BAD_DB_ERROR':
    case 'ENOTFOUND':
      return new AppError(503, `No hay conexión con la base de datos (${e.code}). Revisa el archivo .env y que MySQL esté encendido.`);
    default:
      return undefined;
  }
}
