import { Router } from 'express';
import { asyncHandler, idParam, stringQuery } from '../../common/http';
import { badRequest } from '../../common/errors';
import {
  actualizarDocenteSchema,
  actualizarEstudianteSchema,
  actualizarPersonaSchema,
  crearPersonaSchema,
  docenteSchema,
  estudianteSchema,
} from './personas.schemas';
import { personasService as service } from './personas.service';

export const personasRouter = Router();

personasRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rol = stringQuery(req, 'rol');
    if (rol && rol !== 'estudiante' && rol !== 'docente') throw badRequest("El parámetro 'rol' debe ser 'estudiante' o 'docente'");
    res.json(await service.listar({ rol: rol as 'estudiante' | 'docente' | undefined, texto: stringQuery(req, 'q') }));
  }),
);

personasRouter.get('/:id', asyncHandler(async (req, res) => { res.json(await service.obtener(idParam(req))); }));
personasRouter.post('/', asyncHandler(async (req, res) => { res.status(201).json(await service.crear(crearPersonaSchema.parse(req.body))); }));
personasRouter.put('/:id', asyncHandler(async (req, res) => { res.json(await service.actualizar(idParam(req), actualizarPersonaSchema.parse(req.body))); }));
personasRouter.delete('/:id', asyncHandler(async (req, res) => { await service.eliminar(idParam(req)); res.status(204).end(); }));

// Rol estudiante
personasRouter.post('/:id/estudiante', asyncHandler(async (req, res) => { res.status(201).json(await service.agregarRolEstudiante(idParam(req), estudianteSchema.parse(req.body))); }));
personasRouter.put('/:id/estudiante', asyncHandler(async (req, res) => { res.json(await service.actualizarEstudiante(idParam(req), actualizarEstudianteSchema.parse(req.body))); }));
personasRouter.delete('/:id/estudiante', asyncHandler(async (req, res) => { res.json(await service.quitarRolEstudiante(idParam(req))); }));

// Rol docente
personasRouter.post('/:id/docente', asyncHandler(async (req, res) => { res.status(201).json(await service.agregarRolDocente(idParam(req), docenteSchema.parse(req.body))); }));
personasRouter.put('/:id/docente', asyncHandler(async (req, res) => { res.json(await service.actualizarDocente(idParam(req), actualizarDocenteSchema.parse(req.body))); }));
personasRouter.delete('/:id/docente', asyncHandler(async (req, res) => { res.json(await service.quitarRolDocente(idParam(req))); }));
