import { describe, expect, it } from 'vitest';
import {
  bloquesSeCruzan,
  creaCiclo,
  crucesEntre,
  esAprobada,
  fechasCoherentes,
  hayCupo,
  horaInicioAnterior,
  horasSolapan,
  normalizarHora,
  notaValida,
  periodoAbierto,
  promedioPonderado,
  transicionMatriculaValida,
  transicionPeriodoValida,
} from '../src/domain/rules';

describe('RB-11 horas de un bloque', () => {
  it('inicio debe ser anterior al fin', () => {
    expect(horaInicioAnterior('07:00', '09:00')).toBe(true);
    expect(horaInicioAnterior('09:00', '09:00')).toBe(false);
    expect(horaInicioAnterior('10:00:00', '09:30:00')).toBe(false);
  });
  it('normaliza HH:MM a HH:MM:SS', () => {
    expect(normalizarHora('07:00')).toBe('07:00:00');
    expect(normalizarHora('07:00:30')).toBe('07:00:30');
  });
});

describe('§2.3 cruces de horario', () => {
  it('detecta solapamiento parcial y total', () => {
    expect(horasSolapan('07:00', '09:00', '08:00', '10:00')).toBe(true);
    expect(horasSolapan('07:00', '12:00', '08:00', '09:00')).toBe(true);
  });
  it('bloques contiguos no se cruzan', () => {
    expect(horasSolapan('09:00', '11:00', '11:00', '13:00')).toBe(false);
  });
  it('días distintos no se cruzan; ignora tildes y mayúsculas', () => {
    const a = { dia_semana: 'Miércoles', hora_inicio: '07:00:00', hora_fin: '09:00:00' };
    expect(bloquesSeCruzan(a, { dia_semana: 'Jueves', hora_inicio: '07:00', hora_fin: '09:00' })).toBe(false);
    expect(bloquesSeCruzan(a, { dia_semana: 'miercoles', hora_inicio: '08:00', hora_fin: '10:00' })).toBe(true);
  });
  it('lista los pares que se cruzan', () => {
    const nuevos = [{ dia_semana: 'Lunes', hora_inicio: '18:00', hora_fin: '20:00' }];
    const existentes = [
      { dia_semana: 'Lunes', hora_inicio: '19:00', hora_fin: '21:00' },
      { dia_semana: 'Lunes', hora_inicio: '07:00', hora_fin: '09:00' },
    ];
    expect(crucesEntre(nuevos, existentes)).toHaveLength(1);
  });
});

describe('S-14 fechas del periodo', () => {
  it('inicio < fin', () => {
    expect(fechasCoherentes('2026-07-27', '2026-11-28')).toBe(true);
    expect(fechasCoherentes('2026-11-28', '2026-07-27')).toBe(false);
    expect(fechasCoherentes('2026-07-27', '2026-07-27')).toBe(false);
  });
});

describe('RB-10 / S-12 notas', () => {
  it('rango 0.00 a 5.00 inclusive', () => {
    expect(notaValida(0)).toBe(true);
    expect(notaValida(5)).toBe(true);
    expect(notaValida(5.01)).toBe(false);
    expect(notaValida(-0.1)).toBe(false);
    expect(notaValida(Number.NaN)).toBe(false);
  });
  it('máximo dos decimales', () => {
    expect(notaValida(3.45)).toBe(true);
    expect(notaValida(3.456)).toBe(false);
  });
  it('aprobación con 3.0', () => {
    expect(esAprobada(3)).toBe(true);
    expect(esAprobada(2.99)).toBe(false);
  });
});

describe('cupo y estados', () => {
  it('hay cupo mientras inscritos < cupo', () => {
    expect(hayCupo(25, 24)).toBe(true);
    expect(hayCupo(25, 25)).toBe(false);
  });
  it('periodo cerrado no admite cambios', () => {
    expect(periodoAbierto('Activo')).toBe(true);
    expect(periodoAbierto('Cerrado')).toBe(false);
  });
  it('periodos sólo avanzan', () => {
    expect(transicionPeriodoValida('Planeado', 'Activo')).toBe(true);
    expect(transicionPeriodoValida('Activo', 'Cerrado')).toBe(true);
    expect(transicionPeriodoValida('Cerrado', 'Activo')).toBe(false);
    expect(transicionPeriodoValida('Activo', 'Activo')).toBe(false);
  });
  it('sólo una matrícula Activa se cancela o finaliza', () => {
    expect(transicionMatriculaValida('Activa', 'Cancelada')).toBe(true);
    expect(transicionMatriculaValida('Cancelada', 'Activa')).toBe(false);
    expect(transicionMatriculaValida('Finalizada', 'Cancelada')).toBe(false);
  });
});

describe('RB-13 prerrequisitos sin ciclos', () => {
  // BD102 -> BD101 -> PRG101
  const aristas = [
    { id_asignatura: 5, id_asignatura_requerida: 4 },
    { id_asignatura: 4, id_asignatura_requerida: 2 },
  ];
  it('una asignatura no puede requerirse a sí misma', () => {
    expect(creaCiclo(aristas, 3, 3)).toBe(true);
  });
  it('detecta ciclo indirecto (PRG101 requiere BD102)', () => {
    expect(creaCiclo(aristas, 2, 5)).toBe(true);
  });
  it('permite aristas que no cierran ciclo', () => {
    expect(creaCiclo(aristas, 5, 2)).toBe(false);
    expect(creaCiclo(aristas, 6, 1)).toBe(false);
  });
});

describe('promedio ponderado por créditos', () => {
  it('pondera por créditos y redondea a 2 decimales', () => {
    expect(promedioPonderado([{ nota: 4.2, creditos: 4 }, { nota: 3.0, creditos: 2 }])).toBe(3.8);
  });
  it('null si no hay notas', () => {
    expect(promedioPonderado([])).toBeNull();
  });
});
