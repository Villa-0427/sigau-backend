/**
 * Reglas de negocio puras (sin acceso a base de datos), fáciles de probar con vitest.
 */
import { ESTADOS_PERIODO, NOTA_APROBATORIA, type EstadoPeriodo } from '../common/enums';

/** 'HH:MM' o 'HH:MM:SS' -> minutos desde medianoche. */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** Normaliza 'HH:MM' a 'HH:MM:SS' (formato TIME de MySQL). */
export function normalizarHora(hora: string): string {
  return hora.length === 5 ? `${hora}:00` : hora;
}

/** RB-11: la hora de inicio debe ser anterior a la de finalización. */
export function horaInicioAnterior(inicio: string, fin: string): boolean {
  return aMinutos(inicio) < aMinutos(fin);
}

/** Dos intervalos [a, b) y [c, d) se solapan si a < d y c < b. Bloques contiguos (9-11 y 11-13) NO se cruzan. */
export function horasSolapan(inicioA: string, finA: string, inicioB: string, finB: string): boolean {
  return aMinutos(inicioA) < aMinutos(finB) && aMinutos(inicioB) < aMinutos(finA);
}

export interface Bloque {
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}

const normalizarDia = (d: string) => d.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** §2.3: dos bloques se cruzan si son el mismo día y sus horas se solapan. */
export function bloquesSeCruzan(a: Bloque, b: Bloque): boolean {
  return normalizarDia(a.dia_semana) === normalizarDia(b.dia_semana) && horasSolapan(a.hora_inicio, a.hora_fin, b.hora_inicio, b.hora_fin);
}

/** Devuelve los pares de bloques que se cruzan entre dos listas. */
export function crucesEntre<A extends Bloque, B extends Bloque>(nuevos: A[], existentes: B[]): Array<{ nuevo: A; existente: B }> {
  const cruces: Array<{ nuevo: A; existente: B }> = [];
  for (const nuevo of nuevos) {
    for (const existente of existentes) {
      if (bloquesSeCruzan(nuevo, existente)) cruces.push({ nuevo, existente });
    }
  }
  return cruces;
}

/** S-14: fecha de inicio menor que la de fin ('YYYY-MM-DD'). */
export function fechasCoherentes(inicio: string, fin: string): boolean {
  return new Date(inicio).getTime() < new Date(fin).getTime();
}

/** RB-10 y S-12: nota entre 0.00 y 5.00 con máximo dos decimales. */
export function notaValida(nota: number): boolean {
  if (!Number.isFinite(nota) || nota < 0 || nota > 5) return false;
  return Math.abs(nota * 100 - Math.round(nota * 100)) < 1e-9;
}

export function esAprobada(nota: number): boolean {
  return nota >= NOTA_APROBATORIA;
}

/** RF-07 / S-15: hay cupo si los inscritos activos son menos que el cupo. */
export function hayCupo(cupo: number, inscritos: number): boolean {
  return inscritos < cupo;
}

/** Un periodo cerrado no admite nuevos grupos, matrículas, inscripciones ni notas. */
export function periodoAbierto(estado: string): boolean {
  return estado !== 'Cerrado';
}

/** Los periodos sólo avanzan: Planeado -> Activo -> Cerrado (se permite Planeado -> Cerrado). */
export function transicionPeriodoValida(actual: EstadoPeriodo, nuevo: EstadoPeriodo): boolean {
  return ESTADOS_PERIODO.indexOf(nuevo) > ESTADOS_PERIODO.indexOf(actual);
}

/** Matrícula: sólo una matrícula Activa puede pasar a Cancelada o Finalizada. */
export function transicionMatriculaValida(actual: string, nuevo: string): boolean {
  return actual === 'Activa' && (nuevo === 'Cancelada' || nuevo === 'Finalizada');
}

/**
 * RB-13 (extendida): agregar la arista asignatura -> requerida crea un ciclo
 * si desde `requerida` ya se puede llegar a `asignatura` siguiendo prerrequisitos.
 */
export function creaCiclo(aristas: Array<{ id_asignatura: number; id_asignatura_requerida: number }>, asignatura: number, requerida: number): boolean {
  if (asignatura === requerida) return true;
  const adyacencia = new Map<number, number[]>();
  for (const a of aristas) {
    const lista = adyacencia.get(a.id_asignatura) ?? [];
    lista.push(a.id_asignatura_requerida);
    adyacencia.set(a.id_asignatura, lista);
  }
  const visitados = new Set<number>();
  const pila = [requerida];
  while (pila.length > 0) {
    const actual = pila.pop()!;
    if (actual === asignatura) return true;
    if (visitados.has(actual)) continue;
    visitados.add(actual);
    pila.push(...(adyacencia.get(actual) ?? []));
  }
  return false;
}

/** Promedio ponderado por créditos, redondeado a 2 decimales. null si no hay notas. */
export function promedioPonderado(notas: Array<{ nota: number; creditos: number }>): number | null {
  const totalCreditos = notas.reduce((s, n) => s + n.creditos, 0);
  if (totalCreditos === 0) return null;
  const suma = notas.reduce((s, n) => s + n.nota * n.creditos, 0);
  return Math.round((suma / totalCreditos) * 100) / 100;
}

/** Fecha de hoy 'YYYY-MM-DD' (hora local). */
export function hoy(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
