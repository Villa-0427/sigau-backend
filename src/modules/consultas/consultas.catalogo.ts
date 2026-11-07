/**
 * Anexo A — 50 ejercicios de álgebra relacional traducidos a SQL (MySQL 8).
 * La proyección (π) del álgebra elimina duplicados, por eso se usa DISTINCT donde
 * las reuniones pueden repetir filas. Los valores constantes se pasan como parámetros (RNF-04).
 * Este archivo no depende de la conexión, así se puede reutilizar para generar 03_consultas.sql.
 */

export type TipoParametro = 'numero' | 'texto' | 'lista';

export interface ParametroConsulta {
  nombre: string;
  tipo: TipoParametro;
  porDefecto: string;
  descripcion: string;
}

export interface ConsultaAlgebra {
  numero: number;
  descripcion: string;
  algebra: string;
  sql: string;
  parametros?: ParametroConsulta[];
  /** Construye los valores para los `?` a partir de los parámetros ya convertidos. */
  valores?: (p: Record<string, unknown>) => unknown[];
  nota?: string;
}

const P = {
  numero: (nombre: string, porDefecto: string, descripcion: string): ParametroConsulta => ({ nombre, tipo: 'numero', porDefecto, descripcion }),
  texto: (nombre: string, porDefecto: string, descripcion: string): ParametroConsulta => ({ nombre, tipo: 'texto', porDefecto, descripcion }),
  lista: (nombre: string, porDefecto: string, descripcion: string): ParametroConsulta => ({ nombre, tipo: 'lista', porDefecto, descripcion }),
};

// Reuniones frecuentes
const EST_PERSONA = 'JOIN persona p ON p.id_persona = e.id_persona';
const MAT_EST = 'JOIN estudiante e ON e.id_persona = m.id_persona_estudiante JOIN persona p ON p.id_persona = e.id_persona';

export const CONSULTAS: ConsultaAlgebra[] = [
  // ------------------------------------------------------------ Selección y proyección
  { numero: 1, descripcion: 'Obtener todos los estudiantes.', algebra: 'π_{id_persona, id_programa, fecha_ingreso, estado}(ESTUDIANTE)',
    sql: 'SELECT id_persona, id_programa, fecha_ingreso, estado FROM estudiante' },
  { numero: 2, descripcion: 'Consultar nombres y correos de todas las personas.', algebra: 'π_{nombres, apellidos, email}(PERSONA)',
    sql: 'SELECT DISTINCT nombres, apellidos, email FROM persona' },
  { numero: 3, descripcion: 'Consultar asignaturas con más de 3 créditos.', algebra: 'σ_{creditos > 3}(ASIGNATURA)',
    sql: 'SELECT * FROM asignatura WHERE creditos > ?', parametros: [P.numero('creditos', '3', 'Créditos mínimos (exclusivo)')] },
  { numero: 4, descripcion: 'Listar programas de nivel profesional.', algebra: "σ_{nivel = 'Profesional'}(PROGRAMA)",
    sql: 'SELECT * FROM programa WHERE nivel = ?', parametros: [P.texto('nivel', 'Profesional', 'Nivel académico')] },
  { numero: 5, descripcion: 'Consultar periodos activos.', algebra: "σ_{estado = 'Activo'}(PERIODO)",
    sql: "SELECT * FROM periodo WHERE estado = 'Activo'" },
  { numero: 6, descripcion: 'Obtener aulas con capacidad superior a 30.', algebra: 'σ_{capacidad > 30}(AULA)',
    sql: 'SELECT * FROM aula WHERE capacidad > ?', parametros: [P.numero('capacidad', '30', 'Capacidad mínima (exclusiva)')] },
  { numero: 7, descripcion: 'Consultar grupos de modalidad presencial.', algebra: "σ_{modalidad = 'Presencial'}(GRUPO)",
    sql: 'SELECT * FROM grupo WHERE modalidad = ?', parametros: [P.texto('modalidad', 'Presencial', 'Presencial | Virtual | Híbrida')] },
  { numero: 8, descripcion: 'Obtener horarios de los lunes.', algebra: "σ_{dia_semana = 'Lunes'}(HORARIO)",
    sql: 'SELECT * FROM horario WHERE dia_semana = ?', parametros: [P.texto('dia', 'Lunes', 'Día de la semana')] },
  { numero: 9, descripcion: 'Consultar calificaciones iguales o superiores a 4.0.', algebra: 'σ_{nota_final >= 4.0}(CALIFICACION)',
    sql: 'SELECT * FROM calificacion WHERE nota_final >= ?', parametros: [P.numero('nota', '4.0', 'Nota mínima')] },
  { numero: 10, descripcion: 'Listar docentes activos.', algebra: "σ_{estado = 'Activo'}(DOCENTE)",
    sql: "SELECT * FROM docente WHERE estado = 'Activo'" },

  // ------------------------------------------------------------ Reuniones
  { numero: 11, descripcion: 'Nombres de estudiantes junto con su programa.',
    algebra: 'π_{nombres, apellidos, nombre}(ESTUDIANTE ⋈ PERSONA ⋈ PROGRAMA)',
    sql: `SELECT DISTINCT p.nombres, p.apellidos, pr.nombre AS programa
            FROM estudiante e ${EST_PERSONA} JOIN programa pr ON pr.id_programa = e.id_programa` },
  { numero: 12, descripcion: 'Asignaturas incluidas en cada programa.',
    algebra: 'π_{PROGRAMA.nombre, ASIGNATURA.codigo, ASIGNATURA.nombre}(PROGRAMA ⋈ PLAN_ESTUDIO ⋈ ASIGNATURA)',
    sql: `SELECT DISTINCT pr.nombre AS programa, a.codigo, a.nombre AS asignatura
            FROM programa pr JOIN plan_estudio pe ON pe.id_programa = pr.id_programa
            JOIN asignatura a ON a.id_asignatura = pe.id_asignatura` },
  { numero: 13, descripcion: 'Grupos con nombre de asignatura.', algebra: 'π_{GRUPO.codigo, ASIGNATURA.nombre, GRUPO.cupo}(GRUPO ⋈ ASIGNATURA)',
    sql: `SELECT DISTINCT g.codigo, a.nombre AS asignatura, g.cupo
            FROM grupo g JOIN asignatura a ON a.id_asignatura = g.id_asignatura` },
  { numero: 14, descripcion: 'Grupos con nombre del docente asignado.', algebra: 'π_{GRUPO.codigo, PERSONA.nombres, PERSONA.apellidos}(GRUPO ⋈ DOCENTE ⋈ PERSONA)',
    sql: `SELECT DISTINCT g.codigo, p.nombres, p.apellidos
            FROM grupo g JOIN docente d ON d.id_persona = g.id_docente JOIN persona p ON p.id_persona = d.id_persona` },
  { numero: 15, descripcion: 'Grupos con nombre del periodo.', algebra: 'π_{GRUPO.codigo, PERIODO.nombre}(GRUPO ⋈ PERIODO)',
    sql: `SELECT DISTINCT g.codigo, pe.nombre AS periodo FROM grupo g JOIN periodo pe ON pe.id_periodo = g.id_periodo` },
  { numero: 16, descripcion: 'Matrículas con estudiante y periodo.',
    algebra: 'π_{MATRICULA.id_matricula, PERSONA.nombres, PERSONA.apellidos, PERIODO.nombre}(MATRICULA ⋈ ESTUDIANTE ⋈ PERSONA ⋈ PERIODO)',
    sql: `SELECT m.id_matricula, p.nombres, p.apellidos, pe.nombre AS periodo
            FROM matricula m ${MAT_EST} JOIN periodo pe ON pe.id_periodo = m.id_periodo` },
  { numero: 17, descripcion: 'Inscripciones con estudiante, grupo y asignatura.',
    algebra: 'π_{PERSONA.nombres, PERSONA.apellidos, GRUPO.codigo, ASIGNATURA.nombre}(DETALLE_MATRICULA ⋈ MATRICULA ⋈ ESTUDIANTE ⋈ PERSONA ⋈ GRUPO ⋈ ASIGNATURA)',
    sql: `SELECT DISTINCT p.nombres, p.apellidos, g.codigo AS grupo, a.nombre AS asignatura
            FROM detalle_matricula dm JOIN matricula m ON m.id_matricula = dm.id_matricula ${MAT_EST}
            JOIN grupo g ON g.id_grupo = dm.id_grupo JOIN asignatura a ON a.id_asignatura = g.id_asignatura` },
  { numero: 18, descripcion: 'Horarios con aula y código de grupo.',
    algebra: 'π_{GRUPO.codigo, HORARIO.dia_semana, HORARIO.hora_inicio, HORARIO.hora_fin, AULA.codigo}(HORARIO ⋈ GRUPO ⋈ AULA)',
    sql: `SELECT DISTINCT g.codigo AS grupo, h.dia_semana, h.hora_inicio, h.hora_fin, au.codigo AS aula
            FROM horario h JOIN grupo g ON g.id_grupo = h.id_grupo JOIN aula au ON au.id_aula = h.id_aula` },
  { numero: 19, descripcion: 'Calificaciones con estudiante y asignatura.',
    algebra: 'π_{PERSONA.nombres, PERSONA.apellidos, ASIGNATURA.nombre, CALIFICACION.nota_final}(CALIFICACION ⋈ DETALLE_MATRICULA ⋈ MATRICULA ⋈ ESTUDIANTE ⋈ PERSONA ⋈ GRUPO ⋈ ASIGNATURA)',
    sql: `SELECT DISTINCT p.nombres, p.apellidos, a.nombre AS asignatura, c.nota_final
            FROM calificacion c JOIN detalle_matricula dm ON dm.id_detalle = c.id_detalle
            JOIN matricula m ON m.id_matricula = dm.id_matricula ${MAT_EST}
            JOIN grupo g ON g.id_grupo = dm.id_grupo JOIN asignatura a ON a.id_asignatura = g.id_asignatura` },
  { numero: 20, descripcion: 'Asignaturas y sus prerrequisitos.',
    algebra: 'π_{A.nombre, R.nombre}(ρ_A(ASIGNATURA) ⋈_{A.id_asignatura=PRERREQUISITO.id_asignatura} PRERREQUISITO ⋈_{PRERREQUISITO.id_asignatura_requerida=R.id_asignatura} ρ_R(ASIGNATURA))',
    sql: `SELECT A.nombre AS asignatura, R.nombre AS prerrequisito
            FROM asignatura A JOIN prerrequisito pr ON A.id_asignatura = pr.id_asignatura
            JOIN asignatura R ON pr.id_asignatura_requerida = R.id_asignatura` },

  // ------------------------------------------------------------ Selección + reunión
  { numero: 21, descripcion: 'Estudiantes del programa de Ingeniería de Sistemas.',
    algebra: "π_{PERSONA.nombres, PERSONA.apellidos}(σ_{PROGRAMA.nombre='Ingeniería de Sistemas'}(ESTUDIANTE ⋈ PERSONA ⋈ PROGRAMA))",
    sql: `SELECT DISTINCT p.nombres, p.apellidos
            FROM estudiante e ${EST_PERSONA} JOIN programa pr ON pr.id_programa = e.id_programa
           WHERE pr.nombre = ?`,
    parametros: [P.texto('programa', 'Ingeniería de Sistemas', 'Nombre del programa')] },
  { numero: 22, descripcion: 'Asignaturas obligatorias de un plan de estudios.',
    algebra: 'π_{ASIGNATURA.codigo, ASIGNATURA.nombre}(σ_{obligatoria=TRUE}(PLAN_ESTUDIO ⋈ ASIGNATURA))',
    sql: `SELECT DISTINCT a.codigo, a.nombre
            FROM plan_estudio pe JOIN asignatura a ON a.id_asignatura = pe.id_asignatura
           WHERE pe.obligatoria = TRUE AND pe.id_programa = ?`,
    parametros: [P.numero('id_programa', '1', 'Programa cuyo plan se consulta')] },
  { numero: 23, descripcion: 'Grupos con cupo mayor o igual a 25 en un periodo activo.',
    algebra: "π_{GRUPO.codigo, GRUPO.cupo}(σ_{PERIODO.estado='Activo' ∧ GRUPO.cupo>=25}(GRUPO ⋈ PERIODO))",
    sql: `SELECT DISTINCT g.codigo, g.cupo FROM grupo g JOIN periodo pe ON pe.id_periodo = g.id_periodo
           WHERE pe.estado = 'Activo' AND g.cupo >= ?`,
    parametros: [P.numero('cupo', '25', 'Cupo mínimo')] },
  { numero: 24, descripcion: 'Aulas tipo laboratorio con capacidad mínima de 20.', algebra: "σ_{tipo='Laboratorio' ∧ capacidad>=20}(AULA)",
    sql: "SELECT * FROM aula WHERE tipo = 'Laboratorio' AND capacidad >= ?", parametros: [P.numero('capacidad', '20', 'Capacidad mínima')] },
  { numero: 25, descripcion: 'Estudiantes con matrícula en estado Activa.',
    algebra: "π_{PERSONA.nombres, PERSONA.apellidos}(σ_{MATRICULA.estado='Activa'}(MATRICULA ⋈ ESTUDIANTE ⋈ PERSONA))",
    sql: `SELECT DISTINCT p.nombres, p.apellidos FROM matricula m ${MAT_EST} WHERE m.estado = 'Activa'` },
  { numero: 26, descripcion: 'Docentes que imparten grupos en un periodo activo.',
    algebra: "π_{PERSONA.id_persona, PERSONA.nombres, PERSONA.apellidos}(σ_{PERIODO.estado='Activo'}(DOCENTE ⋈ PERSONA ⋈ GRUPO ⋈ PERIODO))",
    sql: `SELECT DISTINCT p.id_persona, p.nombres, p.apellidos
            FROM docente d JOIN persona p ON p.id_persona = d.id_persona
            JOIN grupo g ON g.id_docente = d.id_persona JOIN periodo pe ON pe.id_periodo = g.id_periodo
           WHERE pe.estado = 'Activo'` },
  { numero: 27, descripcion: 'Grupos de una asignatura específica (por código).',
    algebra: "π_{GRUPO.codigo, GRUPO.cupo}(σ_{ASIGNATURA.codigo='BD101'}(GRUPO ⋈ ASIGNATURA))",
    sql: `SELECT DISTINCT g.codigo, g.cupo FROM grupo g JOIN asignatura a ON a.id_asignatura = g.id_asignatura WHERE a.codigo = ?`,
    parametros: [P.texto('codigo', 'BD101', 'Código de la asignatura')] },
  { numero: 28, descripcion: 'Estudiantes cuya nota final es inferior a 3.0.',
    algebra: 'π_{PERSONA.id_persona, PERSONA.nombres, PERSONA.apellidos}(σ_{CALIFICACION.nota_final<3.0}(PERSONA ⋈ ESTUDIANTE ⋈ MATRICULA ⋈ DETALLE_MATRICULA ⋈ CALIFICACION))',
    sql: `SELECT DISTINCT p.id_persona, p.nombres, p.apellidos
            FROM matricula m ${MAT_EST} JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
            JOIN calificacion c ON c.id_detalle = dm.id_detalle
           WHERE c.nota_final < ?`,
    parametros: [P.numero('nota', '3.0', 'Nota máxima (exclusiva)')] },
  { numero: 29, descripcion: 'Bloques horarios que terminan después de las 18:00.', algebra: "σ_{hora_fin>'18:00'}(HORARIO)",
    sql: 'SELECT * FROM horario WHERE hora_fin > ?', parametros: [P.texto('hora', '18:00', 'Hora HH:MM')] },
  { numero: 30, descripcion: 'Grupos que tienen al menos un horario asignado.', algebra: 'π_{GRUPO.id_grupo, GRUPO.codigo}(GRUPO ⋈ HORARIO)',
    sql: 'SELECT DISTINCT g.id_grupo, g.codigo FROM grupo g JOIN horario h ON h.id_grupo = g.id_grupo' },

  // ------------------------------------------------------------ Operaciones de conjuntos
  { numero: 31, descripcion: 'Personas que tienen rol de estudiante o docente (unión de IDs).', algebra: 'π_{id_persona}(ESTUDIANTE) ∪ π_{id_persona}(DOCENTE)',
    sql: 'SELECT id_persona FROM estudiante UNION SELECT id_persona FROM docente' },
  { numero: 32, descripcion: 'Personas que son simultáneamente estudiantes y docentes.', algebra: 'π_{id_persona}(ESTUDIANTE) ∩ π_{id_persona}(DOCENTE)',
    sql: 'SELECT e.id_persona FROM estudiante e WHERE e.id_persona IN (SELECT d.id_persona FROM docente d)',
    nota: 'La intersección se expresa con IN para compatibilidad con versiones de MySQL anteriores a 8.0.31 (sin INTERSECT).' },
  { numero: 33, descripcion: 'Personas registradas que no tienen rol de estudiante.', algebra: 'π_{id_persona}(PERSONA) − π_{id_persona}(ESTUDIANTE)',
    sql: 'SELECT id_persona FROM persona WHERE id_persona NOT IN (SELECT id_persona FROM estudiante)' },
  { numero: 34, descripcion: 'Asignaturas que no aparecen en ningún plan de estudio.', algebra: 'π_{id_asignatura}(ASIGNATURA) − π_{id_asignatura}(PLAN_ESTUDIO)',
    sql: 'SELECT id_asignatura FROM asignatura WHERE id_asignatura NOT IN (SELECT id_asignatura FROM plan_estudio)' },
  { numero: 35, descripcion: 'Grupos que no tienen ningún detalle de matrícula.', algebra: 'π_{id_grupo}(GRUPO) − π_{id_grupo}(DETALLE_MATRICULA)',
    sql: 'SELECT id_grupo FROM grupo WHERE id_grupo NOT IN (SELECT id_grupo FROM detalle_matricula)' },
  { numero: 36, descripcion: 'Aulas que no están asignadas a ningún horario.', algebra: 'π_{id_aula}(AULA) − π_{id_aula}(HORARIO)',
    sql: 'SELECT id_aula FROM aula WHERE id_aula NOT IN (SELECT id_aula FROM horario)' },
  { numero: 37, descripcion: 'Estudiantes que no tienen matrícula registrada.', algebra: 'π_{id_persona}(ESTUDIANTE) − π_{id_persona_estudiante}(MATRICULA)',
    sql: 'SELECT id_persona FROM estudiante WHERE id_persona NOT IN (SELECT id_persona_estudiante FROM matricula)' },
  { numero: 38, descripcion: 'Asignaturas que son prerrequisito de al menos otra asignatura.', algebra: 'π_{id_asignatura_requerida}(PRERREQUISITO)',
    sql: 'SELECT DISTINCT id_asignatura_requerida FROM prerrequisito' },
  { numero: 39, descripcion: 'Asignaturas que no tienen prerrequisitos.', algebra: 'π_{id_asignatura}(ASIGNATURA) − π_{id_asignatura}(PRERREQUISITO)',
    sql: 'SELECT id_asignatura FROM asignatura WHERE id_asignatura NOT IN (SELECT id_asignatura FROM prerrequisito)' },
  { numero: 40, descripcion: 'Docentes que no tienen grupos asignados.', algebra: 'π_{id_persona}(DOCENTE) − π_{id_docente}(GRUPO)',
    sql: 'SELECT id_persona FROM docente WHERE id_persona NOT IN (SELECT id_docente FROM grupo)' },
  { numero: 41, descripcion: 'Programas que tienen al menos una asignatura en su plan.', algebra: 'π_{PROGRAMA.id_programa, PROGRAMA.nombre}(PROGRAMA ⋈ PLAN_ESTUDIO)',
    sql: 'SELECT DISTINCT pr.id_programa, pr.nombre FROM programa pr JOIN plan_estudio pe ON pe.id_programa = pr.id_programa' },

  // ------------------------------------------------------------ División
  { numero: 42, descripcion: 'Estudiantes matriculados en todos los grupos de un conjunto G (división).',
    algebra: 'π_{id_persona_estudiante,id_grupo}(MATRICULA ⋈ DETALLE_MATRICULA) ÷ G(id_grupo)',
    sql: `SELECT m.id_persona_estudiante
            FROM matricula m JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
           WHERE dm.id_grupo IN (?)
           GROUP BY m.id_persona_estudiante
          HAVING COUNT(DISTINCT dm.id_grupo) = ?`,
    parametros: [P.lista('grupos', '4,6', 'Conjunto G de ids de grupo separados por coma')],
    valores: (p) => [p.grupos, (p.grupos as number[]).length],
    nota: 'La división se implementa con GROUP BY ... HAVING COUNT(DISTINCT) = |G|.' },
  { numero: 43, descripcion: 'Programas que incluyen todas las asignaturas de un conjunto A (división).',
    algebra: 'π_{id_programa,id_asignatura}(PLAN_ESTUDIO) ÷ A(id_asignatura)',
    sql: `SELECT id_programa FROM plan_estudio WHERE id_asignatura IN (?)
           GROUP BY id_programa HAVING COUNT(DISTINCT id_asignatura) = ?`,
    parametros: [P.lista('asignaturas', '1,2', 'Conjunto A de ids de asignatura separados por coma')],
    valores: (p) => [p.asignaturas, (p.asignaturas as number[]).length] },
  { numero: 44, descripcion: 'Estudiantes que han cursado todas las asignaturas de un conjunto A.',
    algebra: 'π_{id_persona_estudiante,id_asignatura}(ESTUDIANTE ⋈ MATRICULA ⋈ DETALLE_MATRICULA ⋈ GRUPO) ÷ A(id_asignatura)',
    sql: `SELECT m.id_persona_estudiante
            FROM estudiante e JOIN matricula m ON m.id_persona_estudiante = e.id_persona
            JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
            JOIN grupo g ON g.id_grupo = dm.id_grupo
           WHERE g.id_asignatura IN (?)
           GROUP BY m.id_persona_estudiante
          HAVING COUNT(DISTINCT g.id_asignatura) = ?`,
    parametros: [P.lista('asignaturas', '1,2', 'Conjunto A de ids de asignatura separados por coma')],
    valores: (p) => [p.asignaturas, (p.asignaturas as number[]).length] },

  // ------------------------------------------------------------ Autorreunión y combinadas
  { numero: 45, descripcion: 'Pares de asignaturas diferentes que tienen el mismo número de créditos (autorreunión).',
    algebra: 'π_{A.codigo,B.codigo}(σ_{A.creditos=B.creditos ∧ A.id_asignatura<B.id_asignatura}(ρ_A(ASIGNATURA) × ρ_B(ASIGNATURA)))',
    sql: `SELECT A.codigo AS codigo_a, B.codigo AS codigo_b
            FROM asignatura A CROSS JOIN asignatura B
           WHERE A.creditos = B.creditos AND A.id_asignatura < B.id_asignatura` },
  { numero: 46, descripcion: 'Estudiantes que tienen al menos una nota registrada y están activos.',
    algebra: "π_{PERSONA.id_persona,PERSONA.nombres}(σ_{ESTUDIANTE.estado='Activo'}(PERSONA ⋈ ESTUDIANTE ⋈ MATRICULA ⋈ DETALLE_MATRICULA ⋈ CALIFICACION))",
    sql: `SELECT DISTINCT p.id_persona, p.nombres
            FROM matricula m ${MAT_EST} JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
            JOIN calificacion c ON c.id_detalle = dm.id_detalle
           WHERE e.estado = 'Activo'` },
  { numero: 47, descripcion: 'Grupos cuyo cupo supera la capacidad del aula asignada en algún horario.',
    algebra: 'π_{GRUPO.id_grupo,GRUPO.codigo}(σ_{GRUPO.cupo>AULA.capacidad}(GRUPO ⋈ HORARIO ⋈ AULA))',
    sql: `SELECT DISTINCT g.id_grupo, g.codigo
            FROM grupo g JOIN horario h ON h.id_grupo = g.id_grupo JOIN aula au ON au.id_aula = h.id_aula
           WHERE g.cupo > au.capacidad`,
    nota: 'Es una consulta de auditoría: la API impide crear este caso (RB-12), el dato de prueba se insertó directamente.' },
  { numero: 48, descripcion: 'Estudiantes que aparecen inscritos en un grupo de una asignatura con prerrequisito.',
    algebra: 'π_{PERSONA.id_persona,PERSONA.nombres,ASIGNATURA.nombre}(PERSONA ⋈ ESTUDIANTE ⋈ MATRICULA ⋈ DETALLE_MATRICULA ⋈ GRUPO ⋈ ASIGNATURA ⋈ PRERREQUISITO)',
    sql: `SELECT DISTINCT p.id_persona, p.nombres, a.nombre AS asignatura
            FROM matricula m ${MAT_EST} JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
            JOIN grupo g ON g.id_grupo = dm.id_grupo JOIN asignatura a ON a.id_asignatura = g.id_asignatura
            JOIN prerrequisito pr ON pr.id_asignatura = a.id_asignatura` },
  { numero: 49, descripcion: 'Asignaturas ofrecidas en grupos de un periodo determinado y que son obligatorias en algún plan.',
    algebra: "π_{ASIGNATURA.codigo,ASIGNATURA.nombre}(σ_{PERIODO.nombre='2026-2'}(ASIGNATURA ⋈ GRUPO ⋈ PERIODO) ⋈_{id_asignatura} σ_{obligatoria=TRUE}(PLAN_ESTUDIO))",
    sql: `SELECT DISTINCT a.codigo, a.nombre
            FROM asignatura a JOIN grupo g ON g.id_asignatura = a.id_asignatura
            JOIN periodo pe ON pe.id_periodo = g.id_periodo
            JOIN plan_estudio pl ON pl.id_asignatura = a.id_asignatura
           WHERE pe.nombre = ? AND pl.obligatoria = TRUE`,
    parametros: [P.texto('periodo', '2026-2', 'Nombre del periodo')],
    nota: 'Se escribe explícita la condición de reunión por id_asignatura, como pide la observación del Anexo A.' },
  { numero: 50, descripcion: 'Estudiantes con matrícula activa que no tienen calificación final en alguno de sus detalles.',
    algebra: "π_{id_persona,nombres}((π_{id_detalle}(σ_{MATRICULA.estado='Activa'}(MATRICULA ⋈ DETALLE_MATRICULA)) − π_{id_detalle}(CALIFICACION)) ⋈ DETALLE_MATRICULA ⋈ MATRICULA ⋈ ESTUDIANTE ⋈ PERSONA)",
    sql: `SELECT DISTINCT p.id_persona, p.nombres
            FROM matricula m ${MAT_EST} JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
           WHERE m.estado = 'Activa'
             AND dm.id_detalle NOT IN (SELECT id_detalle FROM calificacion)`,
    nota: 'La expresión original del documento resta a nivel de estudiante (quita a quien tenga cualquier nota). Para cumplir el enunciado ("en alguno de sus detalles") la diferencia debe hacerse a nivel de id_detalle, como se muestra aquí.' },
];

/** Convierte un valor del query string según el tipo del parámetro. */
export function convertirParametro(def: ParametroConsulta, crudo: string): unknown {
  switch (def.tipo) {
    case 'numero': {
      const n = Number(crudo);
      if (!Number.isFinite(n)) throw new Error(`El parámetro '${def.nombre}' debe ser numérico`);
      return n;
    }
    case 'lista': {
      const lista = crudo.split(',').map((v) => Number(v.trim()));
      if (lista.length === 0 || lista.some((n) => !Number.isInteger(n) || n <= 0)) {
        throw new Error(`El parámetro '${def.nombre}' debe ser una lista de enteros positivos separados por coma`);
      }
      return [...new Set(lista)];
    }
    default:
      return crudo;
  }
}

/** Valores para los `?` de la consulta a partir de un diccionario de entradas crudas. */
export function valoresConsulta(c: ConsultaAlgebra, entradas: Record<string, string | undefined>): unknown[] {
  const convertidos: Record<string, unknown> = {};
  for (const def of c.parametros ?? []) {
    convertidos[def.nombre] = convertirParametro(def, entradas[def.nombre] ?? def.porDefecto);
  }
  return c.valores ? c.valores(convertidos) : (c.parametros ?? []).map((d) => convertidos[d.nombre]);
}
