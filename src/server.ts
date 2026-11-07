import { crearApp } from './app';
import { env } from './config/env';
import { pool } from './db/pool';

const app = crearApp();

const server = app.listen(env.port, async () => {
  console.log(`SIGAU API escuchando en http://localhost:${env.port}`);
  try {
    await pool.query('SELECT 1');
    console.log(`Conectado a MySQL ${env.db.host}:${env.db.port}/${env.db.database}`);
  } catch (e) {
    console.warn(`⚠ No se pudo conectar a MySQL (${(e as { code?: string }).code ?? e}). Revisa .env y ejecuta "npm run db:init".`);
  }
});

const cerrar = () => {
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
};
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
