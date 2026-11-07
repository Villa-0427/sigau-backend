import { Router } from 'express';
import { asyncHandler, idParam, idQuery, stringQuery } from '../../common/http';
import { actualizarAsignaturaSchema, asignaturaSchema, prerrequisitoSchema } from './asignaturas.schemas';
import { asignaturasService as service } from './asignaturas.service';

export const asignaturasRouter = Router();

asignaturasRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await service.listar({ creditosMin: idQuery(req, 'creditosMin'), texto: stringQuery(req, 'q') }));
}));
asignaturasRouter.get('/:id', asyncHandler(async (req, res) => { res.json(await service.obtener(idParam(req))); }));
asignaturasRouter.post('/', asyncHandler(async (req, res) => { res.status(201).json(await service.crear(asignaturaSchema.parse(req.body))); }));
asignaturasRouter.put('/:id', asyncHandler(async (req, res) => { res.json(await service.actualizar(idParam(req), actualizarAsignaturaSchema.parse(req.body))); }));
asignaturasRouter.delete('/:id', asyncHandler(async (req, res) => { await service.eliminar(idParam(req)); res.status(204).end(); }));

// Prerrequisitos (RF-12)
asignaturasRouter.get('/:id/prerrequisitos', asyncHandler(async (req, res) => { res.json(await service.listarPrerrequisitos(idParam(req))); }));
asignaturasRouter.post('/:id/prerrequisitos', asyncHandler(async (req, res) => {
  const { id_asignatura_requerida } = prerrequisitoSchema.parse(req.body);
  res.status(201).json(await service.agregarPrerrequisito(idParam(req), id_asignatura_requerida));
}));
asignaturasRouter.delete('/:id/prerrequisitos/:idRequerida', asyncHandler(async (req, res) => {
  await service.quitarPrerrequisito(idParam(req), idParam(req, 'idRequerida'));
  res.status(204).end();
}));

// RF-13: grupos por asignatura
asignaturasRouter.get('/:id/grupos', asyncHandler(async (req, res) => { res.json(await service.grupos(idParam(req), idQuery(req, 'periodo'))); }));
