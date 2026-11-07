/** RF-13: consultas académicas y ejecución de las 50 consultas del Anexo A. */
import { badRequest, notFound } from '../../common/errors';
import { pool, select } from '../../db/pool';
import { esAprobada, promedioPonderado } from '../../domain/rules';
import { gruposRepository } from '../grupos/grupos.repository';
import { matriculasRepository } from '../matriculas/matriculas.repository';
import { periodosRepository } from '../periodos/periodos.repository';
import { personasRepository } from '../personas/personas.repository';
import { CONSULTAS, valoresConsulta } from './consultas.catalogo';

export const consultasService = {
  catalogo() {
    return CONSULTAS.map(({ numero, descripcion, algebra, sql, parametros, nota }) => ({
      numero,
      descripcion,
      algebra,
      sql: sql.replace(/\s+/g, ' ').trim(),
      parametros: parametros ?? [],
      nota,
    }));
  },

  async ejecutar(numero: number, entradas: Record<string, string | undefined>) {
    const consulta = CONSULTAS.find((c) => c.numero === numero);
    if (!consulta) throw notFound('Consulta', numero);
    let valores: unknown[];
    try {
      valores = valoresConsulta(consulta, entradas);
    } catch (e) {
      throw badRequest((e as Error).message);
    }
    const filas = await select<Record<string, unknown>>(pool, consulta.sql, valores);
    return { numero, descripcion: consulta.descripcion, algebra: consulta.algebra, parametros: valores, total: filas.length, filas };
  },

  /** RF-13: estudiantes (opcionalmente de un programa). */
  async estudiantesPorPrograma(idPrograma?: number) {
    return select<Record<string, unknown>>(
      pool,
      `SELECT p.id_persona, p.tipo_documento, p.numero_documento, p.nombres, p.apellidos, p.email,
              e.fecha_ingreso, e.estado, pr.id_programa, pr.nombre AS programa
         FROM estudiante e
         JOIN persona p   ON p.id_persona = e.id_persona
         JOIN programa pr ON pr.id_programa = e.id_programa
        ${idPrograma ? 'WHERE e.id_programa = ?' : ''}
        ORDER BY pr.nombre, p.apellidos, p.nombres`,
      idPrograma ? [idPrograma] : [],
    );
  },

  /** Historial académico: inscripciones por periodo, notas, créditos y promedio ponderado. */
  async historial(idEstudiante: number) {
    const persona = await personasRepository.obtenerConRoles(pool, idEstudiante);
    if (!persona || !persona.es_estudiante) throw notFound('Estudiante', idEstudiante);

    const filas = await select<{
      periodo: string; id_matricula: number; estado_matricula: string; id_detalle: number; estado_inscripcion: string;
      codigo: string; asignatura: string; creditos: number; grupo: string; nota_final: number | null;
    }>(
      pool,
      `SELECT pe.nombre AS periodo, m.id_matricula, m.estado AS estado_matricula,
              dm.id_detalle, dm.estado AS estado_inscripcion,
              a.codigo, a.nombre AS asignatura, a.creditos, g.codigo AS grupo, c.nota_final
         FROM matricula m
         JOIN periodo pe           ON pe.id_periodo = m.id_periodo
         JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
         JOIN grupo g              ON g.id_grupo = dm.id_grupo
         JOIN asignatura a         ON a.id_asignatura = g.id_asignatura
         LEFT JOIN calificacion c  ON c.id_detalle = dm.id_detalle
        WHERE m.id_persona_estudiante = ?
        ORDER BY pe.fecha_inicio, a.codigo`,
      [idEstudiante],
    );

    const resultado = (f: (typeof filas)[number]) => {
      if (f.estado_inscripcion === 'Retirado') return 'Retirada';
      if (f.nota_final === null) return 'Sin nota';
      return esAprobada(f.nota_final) ? 'Aprobada' : 'Reprobada';
    };
    const conNota = filas.filter((f) => f.estado_inscripcion !== 'Retirado' && f.nota_final !== null);
    const periodos = [...new Set(filas.map((f) => f.periodo))].map((nombre) => {
      const delPeriodo = filas.filter((f) => f.periodo === nombre);
      const notas = delPeriodo.filter((f) => f.estado_inscripcion !== 'Retirado' && f.nota_final !== null);
      return {
        periodo: nombre,
        estado_matricula: delPeriodo[0].estado_matricula,
        promedio_periodo: promedioPonderado(notas.map((n) => ({ nota: n.nota_final!, creditos: n.creditos }))),
        asignaturas: delPeriodo.map((f) => ({ ...f, resultado: resultado(f) })),
      };
    });

    return {
      estudiante: persona,
      promedio_acumulado: promedioPonderado(conNota.map((n) => ({ nota: n.nota_final!, creditos: n.creditos }))),
      creditos_aprobados: conNota.filter((f) => esAprobada(f.nota_final!)).reduce((s, f) => s + f.creditos, 0),
      creditos_en_curso: filas.filter((f) => f.estado_inscripcion === 'Inscrito' && f.nota_final === null).reduce((s, f) => s + f.creditos, 0),
      periodos,
    };
  },

  /** Horario semanal del estudiante en un periodo (por defecto, el periodo Activo). */
  async horarioEstudiante(idEstudiante: number, idPeriodo?: number) {
    if (!(await personasRepository.obtenerEstudiante(pool, idEstudiante))) throw notFound('Estudiante', idEstudiante);
    let periodoId = idPeriodo;
    if (!periodoId) {
      const [activo] = await periodosRepository.listar(pool, 'Activo');
      if (!activo) throw badRequest("No hay un periodo Activo; indique ?periodo=");
      periodoId = activo.id_periodo;
    }
    return { id_periodo: periodoId, bloques: await matriculasRepository.bloquesDelEstudiante(pool, idEstudiante, periodoId) };
  },

  /** Actor Docente: grupos asignados con sus estudiantes. */
  async gruposDocente(idDocente: number, idPeriodo?: number) {
    if (!(await personasRepository.obtenerDocente(pool, idDocente))) throw notFound('Docente', idDocente);
    const grupos = await gruposRepository.listar(pool, { docente: idDocente, periodo: idPeriodo });
    return Promise.all(grupos.map(async (g) => ({ ...g, estudiantes: await gruposRepository.estudiantes(pool, g.id_grupo) })));
  },
};
