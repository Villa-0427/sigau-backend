import { Router } from 'express';
import { MODALIDADES } from '../../common/enums';
import { badRequest } from '../../common/errors';
import { asyncHandler, idParam, idQuery, stringQuery } from '../../common/http';
import { actualizarGrupoSchema, actualizarHorarioSchema, crearGrupoSchema, horarioSchema } from './grupos.schemas';
import { gruposService as service } from './grupos.service';

export const gruposRouter = Router();

gruposRouter.get('/', asyncHandler(async (req, res) => {
  const modalidad = stringQuery(req, 'modalidad');
  if (modalidad && !(MODALIDADES as readonly string[]).includes(modalidad)) throw badRequest(`Modalidad inválida. Valores: ${MODALIDADES.join(', ')}`);
  res.json(await service.listar({
    periodo: idQuery(req, 'periodo'),
    asignatura: idQuery(req, 'asignatura'),
    docente: idQuery(req, 'docente'),
    modalidad,
  }));
}));
gruposRouter.get('/:id', asyncHandler(async (req, res) => { res.json(await service.obtener(idParam(req))); }));
gruposRouter.post('/', asyncHandler(async (req, res) => { res.status(201).json(await service.crear(crearGrupoSchema.parse(req.body))); }));
gruposRouter.put('/:id', asyncHandler(async (req, res) => { res.json(await service.actualizar(idParam(req), actualizarGrupoSchema.parse(req.body))); }));
gruposRouter.delete('/:id', asyncHandler(async (req, res) => { await service.eliminar(idParam(req)); res.status(204).end(); }));
gruposRouter.get('/:id/estudiantes', asyncHandler(async (req, res) => { res.json(await service.estudiantes(idParam(req))); }));

// Horarios del grupo (RF-10)
gruposRouter.get('/:id/horarios', asyncHandler(async (req, res) => { res.json(await service.listarHorarios(idParam(req))); }));
gruposRouter.post('/:id/horarios', asyncHandler(async (req, res) => { res.status(201).json(await service.agregarHorario(idParam(req), horarioSchema.parse(req.body))); }));
gruposRouter.put('/:id/horarios/:idHorario', asyncHandler(async (req, res) => {
  res.json(await service.actualizarHorario(idParam(req), idParam(req, 'idHorario'), actualizarHorarioSchema.parse(req.body)));
}));
gruposRouter.delete('/:id/horarios/:idHorario', asyncHandler(async (req, res) => {
  await service.eliminarHorario(idParam(req), idParam(req, 'idHorario'));
  res.status(204).end();
}));
