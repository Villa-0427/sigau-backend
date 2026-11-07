/** Utilidades de la capa de presentación (Express). */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, badRequest, fromMysqlError } from './errors';

/** Envuelve un controlador async para que sus errores lleguen al errorHandler. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/** Lee un id entero positivo de los parámetros de ruta. */
export function idParam(req: Request, nombre = 'id'): number {
  const valor = Number(req.params[nombre]);
  if (!Number.isInteger(valor) || valor <= 0) throw badRequest(`El parámetro '${nombre}' debe ser un entero positivo`);
  return valor;
}

/** Lee un id opcional del query string (?periodo=2). */
export function idQuery(req: Request, nombre: string): number | undefined {
  const crudo = req.query[nombre];
  if (crudo === undefined || crudo === '') return undefined;
  const valor = Number(crudo);
  if (!Number.isInteger(valor) || valor <= 0) throw badRequest(`El parámetro de consulta '${nombre}' debe ser un entero positivo`);
  return valor;
}

export function stringQuery(req: Request, nombre: string): string | undefined {
  const crudo = req.query[nombre];
  return typeof crudo === 'string' && crudo.trim() !== '' ? crudo.trim() : undefined;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { status: 404, mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        status: 400,
        mensaje: 'Datos de entrada inválidos',
        detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
      },
    });
    return;
  }
  if (err instanceof SyntaxError && 'body' in (err as object)) {
    res.status(400).json({ error: { status: 400, mensaje: 'El cuerpo de la petición no es JSON válido' } });
    return;
  }
  const appError = err instanceof AppError ? err : fromMysqlError(err);
  if (appError) {
    res.status(appError.status).json({
      error: { status: appError.status, regla: appError.regla, mensaje: appError.message, detalles: appError.detalles },
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { status: 500, mensaje: 'Error interno del servidor' } });
}
