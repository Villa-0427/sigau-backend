import { Router } from 'express';
import { asyncHandler, idParam } from '../../common/http';
import { actualizarItemPlanSchema, actualizarProgramaSchema, itemPlanSchema, programaSchema } from './programas.schemas';
import { programasService as service } from './programas.service';

export const programasRouter = Router();

programasRouter.get('/', asyncHandler(async (_req, res) => { res.json(await service.listar()); }));
programasRouter.get('/:id', asyncHandler(async (req, res) => { res.json(await service.obtener(idParam(req))); }));
programasRouter.post('/', asyncHandler(async (req, res) => { res.status(201).json(await service.crear(programaSchema.parse(req.body))); }));
programasRouter.put('/:id', asyncHandler(async (req, res) => { res.json(await service.actualizar(idParam(req), actualizarProgramaSchema.parse(req.body))); }));
programasRouter.delete('/:id', asyncHandler(async (req, res) => { await service.eliminar(idParam(req)); res.status(204).end(); }));

// Plan de estudio (RF-05)
programasRouter.get('/:id/plan', asyncHandler(async (req, res) => { res.json(await service.listarPlan(idParam(req))); }));
programasRouter.post('/:id/plan', asyncHandler(async (req, res) => { res.status(201).json(await service.agregarAsignaturaAlPlan(idParam(req), itemPlanSchema.parse(req.body))); }));
programasRouter.put('/:id/plan/:idAsignatura', asyncHandler(async (req, res) => {
  res.json(await service.actualizarItemPlan(idParam(req), idParam(req, 'idAsignatura'), actualizarItemPlanSchema.parse(req.body)));
}));
programasRouter.delete('/:id/plan/:idAsignatura', asyncHandler(async (req, res) => {
  await service.quitarAsignaturaDelPlan(idParam(req), idParam(req, 'idAsignatura'));
  res.status(204).end();
}));
