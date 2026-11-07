/**
 * Crea la base de datos y carga los datos de prueba ejecutando los scripts SQL.
 * Uso:  npm run db:init            (esquema + datos)
 *       npm run db:init -- --sin-datos   (sólo esquema)
 * No requiere tener el cliente de consola `mysql` instalado.
 * ⚠ Borra y recrea la base de datos indicada en DB_NAME.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env';

async function main() {
  const nombreBd = env.db.database;
  if (!/^\w+$/.test(nombreBd)) throw new Error(`DB_NAME inválido: ${nombreBd}`);

  const archivos = ['01_schema.sql'];
  if (!process.argv.includes('--sin-datos')) archivos.push('02_seed.sql');

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  try {
    for (const archivo of archivos) {
      const sql = readFileSync(join(__dirname, '..', 'database', archivo), 'utf8')
        // Permite usar otro nombre de BD distinto de "sigau" desde .env
        .replace(/(DATABASE(?:\s+IF\s+(?:NOT\s+)?EXISTS)?|USE)\s+sigau\b/gi, `$1 \`${nombreBd}\``);
      await conn.query(sql);
      console.log(`✔ ${archivo} ejecutado`);
    }
    const [tablas] = await conn.query(
      'SELECT table_name AS tabla, table_rows AS filas_aprox FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
      [nombreBd],
    );
    console.table(tablas);
    console.log(`Base de datos '${nombreBd}' lista en ${env.db.host}:${env.db.port}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('✖ Error inicializando la base de datos:', e.code ?? '', e.sqlMessage ?? e.message);
  process.exit(1);
});
