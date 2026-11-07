/**
 * Genera database/03_consultas.sql a partir del catálogo de la API, con los valores
 * por defecto de cada parámetro. Así el archivo SQL y la API nunca se desincronizan.
 * Uso: npm run db:consultas
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { format } from 'mysql2';
import { CONSULTAS, valoresConsulta } from '../src/modules/consultas/consultas.catalogo';

const lineas: string[] = [
  '-- =============================================================================',
  '-- SIGAU — Script 03: las 50 consultas del Anexo A (álgebra relacional) en SQL',
  '-- Archivo generado con `npm run db:consultas` desde src/modules/consultas/consultas.catalogo.ts',
  '-- Los valores mostrados son los parámetros por defecto; en la API se cambian por query string.',
  '-- =============================================================================',
  'USE sigau;',
  '',
];

for (const c of CONSULTAS) {
  const sql = format(c.sql, valoresConsulta(c, {}) as Parameters<typeof format>[1])
    .split('\n')
    .map((l) => l.replace(/^\s{8,}/, '    '))
    .join('\n');
  lineas.push(`-- ${c.numero}. ${c.descripcion}`);
  lineas.push(`--    ${c.algebra}`);
  if (c.nota) lineas.push(`--    Nota: ${c.nota}`);
  lineas.push(`${sql};`, '');
}

const destino = join(__dirname, '..', 'database', '03_consultas.sql');
writeFileSync(destino, lineas.join('\n'), 'utf8');
console.log(`✔ ${CONSULTAS.length} consultas escritas en ${destino}`);
