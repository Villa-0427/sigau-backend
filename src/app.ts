import express from 'express';
import { asyncHandler, errorHandler, notFoundHandler } from './common/http';
import { pool, selectOne } from './db/pool';
import { asignaturasRouter } from './modules/asignaturas/asignaturas.controller';
import { aulasRouter } from './modules/aulas/aulas.controller';
import { consultasRouter, docentesRouter, estudiantesRouter } from './modules/consultas/consultas.controller';
import { gruposRouter } from './modules/grupos/grupos.controller';
import { calificacionesRouter, detallesRouter, matriculasRouter } from './modules/matriculas/matriculas.controller';
import { periodosRouter } from './modules/periodos/periodos.controller';
import { personasRouter } from './modules/personas/personas.controller';
import { programasRouter } from './modules/programas/programas.controller';

export function crearApp() {
  const app = express();
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({
      nombre: 'SIGAU — Sistema de Gestión Académica Universitaria (API)',
      recursos: [
        '/api/health', '/api/personas', '/api/programas', '/api/asignaturas', '/api/periodos', '/api/aulas',
        '/api/grupos', '/api/matriculas', '/api/detalles/:id', '/api/calificaciones', '/api/estudiantes',
        '/api/docentes/:id/grupos', '/api/consultas',
      ],
    });
  });

  app.get('/api/health', asyncHandler(async (_req, res) => {
    const r = await selectOne<{ version: string; db: string }>(pool, 'SELECT VERSION() AS version, DATABASE() AS db');
    res.json({ estado: 'ok', mysql: r?.version, base_de_datos: r?.db });
  }));

  app.use('/api/personas', personasRouter);
  app.use('/api/programas', programasRouter);
  app.use('/api/asignaturas', asignaturasRouter);
  app.use('/api/periodos', periodosRouter);
  app.use('/api/aulas', aulasRouter);
  app.use('/api/grupos', gruposRouter);
  app.use('/api/matriculas', matriculasRouter);
  app.use('/api/detalles', detallesRouter);
  app.use('/api/calificaciones', calificacionesRouter);
  app.use('/api/estudiantes', estudiantesRouter);
  app.use('/api/docentes', docentesRouter);
  app.use('/api/consultas', consultasRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
