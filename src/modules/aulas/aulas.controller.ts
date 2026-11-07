import { Router } from 'express';
import { asyncHandler, idParam, idQuery, stringQuery } from '../../common/http';
import { actualizarAulaSchema, aulaSchema } from './aulas.schemas';
import { aulasService as service } from './aulas.service';

export const aulasRouter = Router();

aulasRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await service.listar({ tipo: stringQuery(req, 'tipo'), capacidadMin: idQuery(req, 'capacidadMin') }));
}));
aulasRouter.get('/:id', asyncHandler(async (req, res) => { res.json(await service.obtener(idParam(req))); }));
aulasRouter.post('/', asyncHandler(async (req, res) => { res.status(201).json(await service.crear(aulaSchema.parse(req.body))); }));
aulasRouter.put('/:id', asyncHandler(async (req, res) => { res.json(await service.actualizar(idParam(req), actualizarAulaSchema.parse(req.body))); }));
aulasRouter.delete('/:id', asyncHandler(async (req, res) => { await service.eliminar(idParam(req)); res.status(204).end(); }));
// RF-13: horarios por aula
aulasRouter.get('/:id/horarios', asyncHandler(async (req, res) => { res.json(await service.horarios(idParam(req), idQuery(req, 'periodo'))); }));
