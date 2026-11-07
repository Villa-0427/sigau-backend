import { Router } from 'express';
import { asyncHandler, idParam, idQuery, stringQuery } from '../../common/http';
import { calificacionSchema, cambiarEstadoMatriculaSchema, crearMatriculaSchema, inscribirGrupoSchema } from './matriculas.schemas';
import { matriculasService as service } from './matriculas.service';

/** /api/matriculas */
export const matriculasRouter = Router();

matriculasRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await service.listar({ estudiante: idQuery(req, 'estudiante'), periodo: idQuery(req, 'periodo'), estado: stringQuery(req, 'estado') }));
}));
matriculasRouter.get('/:id', asyncHandler(async (req, res) => { res.json(await service.obtener(idParam(req))); }));
matriculasRouter.post('/', asyncHandler(async (req, res) => { res.status(201).json(await service.crear(crearMatriculaSchema.parse(req.body))); }));
matriculasRouter.patch('/:id/estado', asyncHandler(async (req, res) => {
  res.json(await service.cambiarEstado(idParam(req), cambiarEstadoMatriculaSchema.parse(req.body).estado));
}));
matriculasRouter.delete('/:id', asyncHandler(async (req, res) => { await service.eliminar(idParam(req)); res.status(204).end(); }));
matriculasRouter.post('/:id/detalles', asyncHandler(async (req, res) => {
  res.status(201).json(await service.inscribirGrupo(idParam(req), inscribirGrupoSchema.parse(req.body)));
}));

/** /api/detalles — inscripciones individuales y su calificación */
export const detallesRouter = Router();

detallesRouter.patch('/:id/retirar', asyncHandler(async (req, res) => { res.json(await service.retirarDetalle(idParam(req))); }));
detallesRouter.get('/:id/calificacion', asyncHandler(async (req, res) => { res.json(await service.obtenerCalificacion(idParam(req))); }));
detallesRouter.put('/:id/calificacion', asyncHandler(async (req, res) => {
  res.json(await service.registrarCalificacion(idParam(req), calificacionSchema.parse(req.body)));
}));
detallesRouter.delete('/:id/calificacion', asyncHandler(async (req, res) => { await service.eliminarCalificacion(idParam(req)); res.status(204).end(); }));

/** /api/calificaciones — consulta (RF-13) */
export const calificacionesRouter = Router();

calificacionesRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await service.listarCalificaciones({
    periodo: idQuery(req, 'periodo'),
    grupo: idQuery(req, 'grupo'),
    estudiante: idQuery(req, 'estudiante'),
    asignatura: idQuery(req, 'asignatura'),
  }));
}));
