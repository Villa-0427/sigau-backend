import { Router } from 'express';
import { asyncHandler, idParam, stringQuery } from '../../common/http';
import { actualizarPeriodoSchema, cambiarEstadoPeriodoSchema, crearPeriodoSchema } from './periodos.schemas';
import { periodosService as service } from './periodos.service';

export const periodosRouter = Router();

periodosRouter.get('/', asyncHandler(async (req, res) => { res.json(await service.listar(stringQuery(req, 'estado'))); }));
periodosRouter.get('/:id', asyncHandler(async (req, res) => { res.json(await service.obtener(idParam(req))); }));
periodosRouter.post('/', asyncHandler(async (req, res) => { res.status(201).json(await service.crear(crearPeriodoSchema.parse(req.body))); }));
periodosRouter.put('/:id', asyncHandler(async (req, res) => { res.json(await service.actualizar(idParam(req), actualizarPeriodoSchema.parse(req.body))); }));
periodosRouter.patch('/:id/estado', asyncHandler(async (req, res) => {
  res.json(await service.cambiarEstado(idParam(req), cambiarEstadoPeriodoSchema.parse(req.body).estado));
}));
periodosRouter.delete('/:id', asyncHandler(async (req, res) => { await service.eliminar(idParam(req)); res.status(204).end(); }));
periodosRouter.get('/:id/oferta', asyncHandler(async (req, res) => { res.json(await service.oferta(idParam(req))); }));
