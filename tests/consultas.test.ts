import { describe, expect, it } from 'vitest';
import { CONSULTAS, valoresConsulta } from '../src/modules/consultas/consultas.catalogo';

describe('Catálogo de las 50 consultas del Anexo A', () => {
  it('contiene exactamente las consultas 1 a 50', () => {
    expect(CONSULTAS.map((c) => c.numero)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it.each(CONSULTAS.map((c) => [c.numero, c] as const))('consulta %i: los marcadores ? coinciden con los valores', (_n, c) => {
    const marcadores = (c.sql.match(/\?/g) ?? []).length;
    expect(valoresConsulta(c, {})).toHaveLength(marcadores);
  });

  it('la división (42) usa |G| como cardinalidad', () => {
    const c42 = CONSULTAS.find((c) => c.numero === 42)!;
    expect(valoresConsulta(c42, { grupos: '4,6,6' })).toEqual([[4, 6], 2]);
  });

  it('rechaza listas inválidas', () => {
    const c43 = CONSULTAS.find((c) => c.numero === 43)!;
    expect(() => valoresConsulta(c43, { asignaturas: '1,abc' })).toThrow();
  });
});
