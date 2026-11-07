import { Router } from 'express';
import { asyncHandler, idParam, idQuery } from '../../common/http';
import { consultasService as service } from './consultas.service';

/** /api/consultas — Anexo A */
export const consultasRouter = Router();

consultasRouter.get('/', (_req, res) => { res.json(service.catalogo()); });
consultasRouter.get('/:id', asyncHandler(async (req, res) => {
  const entradas: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.query)) if (typeof v === 'string') entradas[k] = v;
  res.json(await service.ejecutar(idParam(req), entradas));
}));

/** /api/estudiantes — consultas del actor Estudiante / Registro académico */
export const estudiantesRouter = Router();

estudiantesRouter.get('/', asyncHandler(async (req, res) => { res.json(await service.estudiantesPorPrograma(idQuery(req, 'programa'))); }));
estudiantesRouter.get('/:id/historial', asyncHandler(async (req, res) => { res.json(await service.historial(idParam(req))); }));
estudiantesRouter.get('/:id/horario', asyncHandler(async (req, res) => { res.json(await service.horarioEstudiante(idParam(req), idQuery(req, 'periodo'))); }));

/** /api/docentes — consultas del actor Docente */
export const docentesRouter = Router();

docentesRouter.get('/:id/grupos', asyncHandler(async (req, res) => { res.json(await service.gruposDocente(idParam(req), idQuery(req, 'periodo'))); }));
