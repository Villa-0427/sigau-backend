-- =============================================================================
-- SIGAU — Script 03: las 50 consultas del Anexo A (álgebra relacional) en SQL
-- Archivo generado con `npm run db:consultas` desde src/modules/consultas/consultas.catalogo.ts
-- Los valores mostrados son los parámetros por defecto; en la API se cambian por query string.
-- =============================================================================
USE sigau;

-- 1. Obtener todos los estudiantes.
--    π_{id_persona, id_programa, fecha_ingreso, estado}(ESTUDIANTE)
SELECT id_persona, id_programa, fecha_ingreso, estado FROM estudiante;

-- 2. Consultar nombres y correos de todas las personas.
--    π_{nombres, apellidos, email}(PERSONA)
SELECT DISTINCT nombres, apellidos, email FROM persona;

-- 3. Consultar asignaturas con más de 3 créditos.
--    σ_{creditos > 3}(ASIGNATURA)
SELECT * FROM asignatura WHERE creditos > 3;

-- 4. Listar programas de nivel profesional.
--    σ_{nivel = 'Profesional'}(PROGRAMA)
SELECT * FROM programa WHERE nivel = 'Profesional';

-- 5. Consultar periodos activos.
--    σ_{estado = 'Activo'}(PERIODO)
SELECT * FROM periodo WHERE estado = 'Activo';

-- 6. Obtener aulas con capacidad superior a 30.
--    σ_{capacidad > 30}(AULA)
SELECT * FROM aula WHERE capacidad > 30;

-- 7. Consultar grupos de modalidad presencial.
--    σ_{modalidad = 'Presencial'}(GRUPO)
SELECT * FROM grupo WHERE modalidad = 'Presencial';

-- 8. Obtener horarios de los lunes.
--    σ_{dia_semana = 'Lunes'}(HORARIO)
SELECT * FROM horario WHERE dia_semana = 'Lunes';

-- 9. Consultar calificaciones iguales o superiores a 4.0.
--    σ_{nota_final >= 4.0}(CALIFICACION)
SELECT * FROM calificacion WHERE nota_final >= 4;

-- 10. Listar docentes activos.
--    σ_{estado = 'Activo'}(DOCENTE)
SELECT * FROM docente WHERE estado = 'Activo';

-- 11. Nombres de estudiantes junto con su programa.
--    π_{nombres, apellidos, nombre}(ESTUDIANTE ⋈ PERSONA ⋈ PROGRAMA)
SELECT DISTINCT p.nombres, p.apellidos, pr.nombre AS programa
    FROM estudiante e JOIN persona p ON p.id_persona = e.id_persona JOIN programa pr ON pr.id_programa = e.id_programa;

-- 12. Asignaturas incluidas en cada programa.
--    π_{PROGRAMA.nombre, ASIGNATURA.codigo, ASIGNATURA.nombre}(PROGRAMA ⋈ PLAN_ESTUDIO ⋈ ASIGNATURA)
SELECT DISTINCT pr.nombre AS programa, a.codigo, a.nombre AS asignatura
    FROM programa pr JOIN plan_estudio pe ON pe.id_programa = pr.id_programa
    JOIN asignatura a ON a.id_asignatura = pe.id_asignatura;

-- 13. Grupos con nombre de asignatura.
--    π_{GRUPO.codigo, ASIGNATURA.nombre, GRUPO.cupo}(GRUPO ⋈ ASIGNATURA)
SELECT DISTINCT g.codigo, a.nombre AS asignatura, g.cupo
    FROM grupo g JOIN asignatura a ON a.id_asignatura = g.id_asignatura;

-- 14. Grupos con nombre del docente asignado.
--    π_{GRUPO.codigo, PERSONA.nombres, PERSONA.apellidos}(GRUPO ⋈ DOCENTE ⋈ PERSONA)
SELECT DISTINCT g.codigo, p.nombres, p.apellidos
    FROM grupo g JOIN docente d ON d.id_persona = g.id_docente JOIN persona p ON p.id_persona = d.id_persona;

-- 15. Grupos con nombre del periodo.
--    π_{GRUPO.codigo, PERIODO.nombre}(GRUPO ⋈ PERIODO)
SELECT DISTINCT g.codigo, pe.nombre AS periodo FROM grupo g JOIN periodo pe ON pe.id_periodo = g.id_periodo;

-- 16. Matrículas con estudiante y periodo.
--    π_{MATRICULA.id_matricula, PERSONA.nombres, PERSONA.apellidos, PERIODO.nombre}(MATRICULA ⋈ ESTUDIANTE ⋈ PERSONA ⋈ PERIODO)
SELECT m.id_matricula, p.nombres, p.apellidos, pe.nombre AS periodo
    FROM matricula m JOIN estudiante e ON e.id_persona = m.id_persona_estudiante JOIN persona p ON p.id_persona = e.id_persona JOIN periodo pe ON pe.id_periodo = m.id_periodo;

-- 17. Inscripciones con estudiante, grupo y asignatura.
--    π_{PERSONA.nombres, PERSONA.apellidos, GRUPO.codigo, ASIGNATURA.nombre}(DETALLE_MATRICULA ⋈ MATRICULA ⋈ ESTUDIANTE ⋈ PERSONA ⋈ GRUPO ⋈ ASIGNATURA)
SELECT DISTINCT p.nombres, p.apellidos, g.codigo AS grupo, a.nombre AS asignatura
    FROM detalle_matricula dm JOIN matricula m ON m.id_matricula = dm.id_matricula JOIN estudiante e ON e.id_persona = m.id_persona_estudiante JOIN persona p ON p.id_persona = e.id_persona
    JOIN grupo g ON g.id_grupo = dm.id_grupo JOIN asignatura a ON a.id_asignatura = g.id_asignatura;

-- 18. Horarios con aula y código de grupo.
--    π_{GRUPO.codigo, HORARIO.dia_semana, HORARIO.hora_inicio, HORARIO.hora_fin, AULA.codigo}(HORARIO ⋈ GRUPO ⋈ AULA)
SELECT DISTINCT g.codigo AS grupo, h.dia_semana, h.hora_inicio, h.hora_fin, au.codigo AS aula
    FROM horario h JOIN grupo g ON g.id_grupo = h.id_grupo JOIN aula au ON au.id_aula = h.id_aula;

-- 19. Calificaciones con estudiante y asignatura.
--    π_{PERSONA.nombres, PERSONA.apellidos, ASIGNATURA.nombre, CALIFICACION.nota_final}(CALIFICACION ⋈ DETALLE_MATRICULA ⋈ MATRICULA ⋈ ESTUDIANTE ⋈ PERSONA ⋈ GRUPO ⋈ ASIGNATURA)
SELECT DISTINCT p.nombres, p.apellidos, a.nombre AS asignatura, c.nota_final
    FROM calificacion c JOIN detalle_matricula dm ON dm.id_detalle = c.id_detalle
    JOIN matricula m ON m.id_matricula = dm.id_matricula JOIN estudiante e ON e.id_persona = m.id_persona_estudiante JOIN persona p ON p.id_persona = e.id_persona
    JOIN grupo g ON g.id_grupo = dm.id_grupo JOIN asignatura a ON a.id_asignatura = g.id_asignatura;

-- 20. Asignaturas y sus prerrequisitos.
--    π_{A.nombre, R.nombre}(ρ_A(ASIGNATURA) ⋈_{A.id_asignatura=PRERREQUISITO.id_asignatura} PRERREQUISITO ⋈_{PRERREQUISITO.id_asignatura_requerida=R.id_asignatura} ρ_R(ASIGNATURA))
SELECT A.nombre AS asignatura, R.nombre AS prerrequisito
    FROM asignatura A JOIN prerrequisito pr ON A.id_asignatura = pr.id_asignatura
    JOIN asignatura R ON pr.id_asignatura_requerida = R.id_asignatura;

-- 21. Estudiantes del programa de Ingeniería de Sistemas.
--    π_{PERSONA.nombres, PERSONA.apellidos}(σ_{PROGRAMA.nombre='Ingeniería de Sistemas'}(ESTUDIANTE ⋈ PERSONA ⋈ PROGRAMA))
SELECT DISTINCT p.nombres, p.apellidos
    FROM estudiante e JOIN persona p ON p.id_persona = e.id_persona JOIN programa pr ON pr.id_programa = e.id_programa
    WHERE pr.nombre = 'Ingeniería de Sistemas';

-- 22. Asignaturas obligatorias de un plan de estudios.
--    π_{ASIGNATURA.codigo, ASIGNATURA.nombre}(σ_{obligatoria=TRUE}(PLAN_ESTUDIO ⋈ ASIGNATURA))
SELECT DISTINCT a.codigo, a.nombre
    FROM plan_estudio pe JOIN asignatura a ON a.id_asignatura = pe.id_asignatura
    WHERE pe.obligatoria = TRUE AND pe.id_programa = 1;

-- 23. Grupos con cupo mayor o igual a 25 en un periodo activo.
--    π_{GRUPO.codigo, GRUPO.cupo}(σ_{PERIODO.estado='Activo' ∧ GRUPO.cupo>=25}(GRUPO ⋈ PERIODO))
SELECT DISTINCT g.codigo, g.cupo FROM grupo g JOIN periodo pe ON pe.id_periodo = g.id_periodo
    WHERE pe.estado = 'Activo' AND g.cupo >= 25;

-- 24. Aulas tipo laboratorio con capacidad mínima de 20.
--    σ_{tipo='Laboratorio' ∧ capacidad>=20}(AULA)
SELECT * FROM aula WHERE tipo = 'Laboratorio' AND capacidad >= 20;

-- 25. Estudiantes con matrícula en estado Activa.
--    π_{PERSONA.nombres, PERSONA.apellidos}(σ_{MATRICULA.estado='Activa'}(MATRICULA ⋈ ESTUDIANTE ⋈ PERSONA))
SELECT DISTINCT p.nombres, p.apellidos FROM matricula m JOIN estudiante e ON e.id_persona = m.id_persona_estudiante JOIN persona p ON p.id_persona = e.id_persona WHERE m.estado = 'Activa';

-- 26. Docentes que imparten grupos en un periodo activo.
--    π_{PERSONA.id_persona, PERSONA.nombres, PERSONA.apellidos}(σ_{PERIODO.estado='Activo'}(DOCENTE ⋈ PERSONA ⋈ GRUPO ⋈ PERIODO))
SELECT DISTINCT p.id_persona, p.nombres, p.apellidos
    FROM docente d JOIN persona p ON p.id_persona = d.id_persona
    JOIN grupo g ON g.id_docente = d.id_persona JOIN periodo pe ON pe.id_periodo = g.id_periodo
    WHERE pe.estado = 'Activo';

-- 27. Grupos de una asignatura específica (por código).
--    π_{GRUPO.codigo, GRUPO.cupo}(σ_{ASIGNATURA.codigo='BD101'}(GRUPO ⋈ ASIGNATURA))
SELECT DISTINCT g.codigo, g.cupo FROM grupo g JOIN asignatura a ON a.id_asignatura = g.id_asignatura WHERE a.codigo = 'BD101';

-- 28. Estudiantes cuya nota final es inferior a 3.0.
--    π_{PERSONA.id_persona, PERSONA.nombres, PERSONA.apellidos}(σ_{CALIFICACION.nota_final<3.0}(PERSONA ⋈ ESTUDIANTE ⋈ MATRICULA ⋈ DETALLE_MATRICULA ⋈ CALIFICACION))
SELECT DISTINCT p.id_persona, p.nombres, p.apellidos
    FROM matricula m JOIN estudiante e ON e.id_persona = m.id_persona_estudiante JOIN persona p ON p.id_persona = e.id_persona JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
    JOIN calificacion c ON c.id_detalle = dm.id_detalle
    WHERE c.nota_final < 3;

-- 29. Bloques horarios que terminan después de las 18:00.
--    σ_{hora_fin>'18:00'}(HORARIO)
SELECT * FROM horario WHERE hora_fin > '18:00';

-- 30. Grupos que tienen al menos un horario asignado.
--    π_{GRUPO.id_grupo, GRUPO.codigo}(GRUPO ⋈ HORARIO)
SELECT DISTINCT g.id_grupo, g.codigo FROM grupo g JOIN horario h ON h.id_grupo = g.id_grupo;

-- 31. Personas que tienen rol de estudiante o docente (unión de IDs).
--    π_{id_persona}(ESTUDIANTE) ∪ π_{id_persona}(DOCENTE)
SELECT id_persona FROM estudiante UNION SELECT id_persona FROM docente;

-- 32. Personas que son simultáneamente estudiantes y docentes.
--    π_{id_persona}(ESTUDIANTE) ∩ π_{id_persona}(DOCENTE)
--    Nota: La intersección se expresa con IN para compatibilidad con versiones de MySQL anteriores a 8.0.31 (sin INTERSECT).
SELECT e.id_persona FROM estudiante e WHERE e.id_persona IN (SELECT d.id_persona FROM docente d);

-- 33. Personas registradas que no tienen rol de estudiante.
--    π_{id_persona}(PERSONA) − π_{id_persona}(ESTUDIANTE)
SELECT id_persona FROM persona WHERE id_persona NOT IN (SELECT id_persona FROM estudiante);

-- 34. Asignaturas que no aparecen en ningún plan de estudio.
--    π_{id_asignatura}(ASIGNATURA) − π_{id_asignatura}(PLAN_ESTUDIO)
SELECT id_asignatura FROM asignatura WHERE id_asignatura NOT IN (SELECT id_asignatura FROM plan_estudio);

-- 35. Grupos que no tienen ningún detalle de matrícula.
--    π_{id_grupo}(GRUPO) − π_{id_grupo}(DETALLE_MATRICULA)
SELECT id_grupo FROM grupo WHERE id_grupo NOT IN (SELECT id_grupo FROM detalle_matricula);

-- 36. Aulas que no están asignadas a ningún horario.
--    π_{id_aula}(AULA) − π_{id_aula}(HORARIO)
SELECT id_aula FROM aula WHERE id_aula NOT IN (SELECT id_aula FROM horario);

-- 37. Estudiantes que no tienen matrícula registrada.
--    π_{id_persona}(ESTUDIANTE) − π_{id_persona_estudiante}(MATRICULA)
SELECT id_persona FROM estudiante WHERE id_persona NOT IN (SELECT id_persona_estudiante FROM matricula);

-- 38. Asignaturas que son prerrequisito de al menos otra asignatura.
--    π_{id_asignatura_requerida}(PRERREQUISITO)
SELECT DISTINCT id_asignatura_requerida FROM prerrequisito;

-- 39. Asignaturas que no tienen prerrequisitos.
--    π_{id_asignatura}(ASIGNATURA) − π_{id_asignatura}(PRERREQUISITO)
SELECT id_asignatura FROM asignatura WHERE id_asignatura NOT IN (SELECT id_asignatura FROM prerrequisito);

-- 40. Docentes que no tienen grupos asignados.
--    π_{id_persona}(DOCENTE) − π_{id_docente}(GRUPO)
SELECT id_persona FROM docente WHERE id_persona NOT IN (SELECT id_docente FROM grupo);

-- 41. Programas que tienen al menos una asignatura en su plan.
--    π_{PROGRAMA.id_programa, PROGRAMA.nombre}(PROGRAMA ⋈ PLAN_ESTUDIO)
SELECT DISTINCT pr.id_programa, pr.nombre FROM programa pr JOIN plan_estudio pe ON pe.id_programa = pr.id_programa;

-- 42. Estudiantes matriculados en todos los grupos de un conjunto G (división).
--    π_{id_persona_estudiante,id_grupo}(MATRICULA ⋈ DETALLE_MATRICULA) ÷ G(id_grupo)
--    Nota: La división se implementa con GROUP BY ... HAVING COUNT(DISTINCT) = |G|.
SELECT m.id_persona_estudiante
    FROM matricula m JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
    WHERE dm.id_grupo IN (4, 6)
    GROUP BY m.id_persona_estudiante
    HAVING COUNT(DISTINCT dm.id_grupo) = 2;

-- 43. Programas que incluyen todas las asignaturas de un conjunto A (división).
--    π_{id_programa,id_asignatura}(PLAN_ESTUDIO) ÷ A(id_asignatura)
SELECT id_programa FROM plan_estudio WHERE id_asignatura IN (1, 2)
    GROUP BY id_programa HAVING COUNT(DISTINCT id_asignatura) = 2;

-- 44. Estudiantes que han cursado todas las asignaturas de un conjunto A.
--    π_{id_persona_estudiante,id_asignatura}(ESTUDIANTE ⋈ MATRICULA ⋈ DETALLE_MATRICULA ⋈ GRUPO) ÷ A(id_asignatura)
SELECT m.id_persona_estudiante
    FROM estudiante e JOIN matricula m ON m.id_persona_estudiante = e.id_persona
    JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
    JOIN grupo g ON g.id_grupo = dm.id_grupo
    WHERE g.id_asignatura IN (1, 2)
    GROUP BY m.id_persona_estudiante
    HAVING COUNT(DISTINCT g.id_asignatura) = 2;

-- 45. Pares de asignaturas diferentes que tienen el mismo número de créditos (autorreunión).
--    π_{A.codigo,B.codigo}(σ_{A.creditos=B.creditos ∧ A.id_asignatura<B.id_asignatura}(ρ_A(ASIGNATURA) × ρ_B(ASIGNATURA)))
SELECT A.codigo AS codigo_a, B.codigo AS codigo_b
    FROM asignatura A CROSS JOIN asignatura B
    WHERE A.creditos = B.creditos AND A.id_asignatura < B.id_asignatura;

-- 46. Estudiantes que tienen al menos una nota registrada y están activos.
--    π_{PERSONA.id_persona,PERSONA.nombres}(σ_{ESTUDIANTE.estado='Activo'}(PERSONA ⋈ ESTUDIANTE ⋈ MATRICULA ⋈ DETALLE_MATRICULA ⋈ CALIFICACION))
SELECT DISTINCT p.id_persona, p.nombres
    FROM matricula m JOIN estudiante e ON e.id_persona = m.id_persona_estudiante JOIN persona p ON p.id_persona = e.id_persona JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
    JOIN calificacion c ON c.id_detalle = dm.id_detalle
    WHERE e.estado = 'Activo';

-- 47. Grupos cuyo cupo supera la capacidad del aula asignada en algún horario.
--    π_{GRUPO.id_grupo,GRUPO.codigo}(σ_{GRUPO.cupo>AULA.capacidad}(GRUPO ⋈ HORARIO ⋈ AULA))
--    Nota: Es una consulta de auditoría: la API impide crear este caso (RB-12), el dato de prueba se insertó directamente.
SELECT DISTINCT g.id_grupo, g.codigo
    FROM grupo g JOIN horario h ON h.id_grupo = g.id_grupo JOIN aula au ON au.id_aula = h.id_aula
    WHERE g.cupo > au.capacidad;

-- 48. Estudiantes que aparecen inscritos en un grupo de una asignatura con prerrequisito.
--    π_{PERSONA.id_persona,PERSONA.nombres,ASIGNATURA.nombre}(PERSONA ⋈ ESTUDIANTE ⋈ MATRICULA ⋈ DETALLE_MATRICULA ⋈ GRUPO ⋈ ASIGNATURA ⋈ PRERREQUISITO)
SELECT DISTINCT p.id_persona, p.nombres, a.nombre AS asignatura
    FROM matricula m JOIN estudiante e ON e.id_persona = m.id_persona_estudiante JOIN persona p ON p.id_persona = e.id_persona JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
    JOIN grupo g ON g.id_grupo = dm.id_grupo JOIN asignatura a ON a.id_asignatura = g.id_asignatura
    JOIN prerrequisito pr ON pr.id_asignatura = a.id_asignatura;

-- 49. Asignaturas ofrecidas en grupos de un periodo determinado y que son obligatorias en algún plan.
--    π_{ASIGNATURA.codigo,ASIGNATURA.nombre}(σ_{PERIODO.nombre='2026-2'}(ASIGNATURA ⋈ GRUPO ⋈ PERIODO) ⋈_{id_asignatura} σ_{obligatoria=TRUE}(PLAN_ESTUDIO))
--    Nota: Se escribe explícita la condición de reunión por id_asignatura, como pide la observación del Anexo A.
SELECT DISTINCT a.codigo, a.nombre
    FROM asignatura a JOIN grupo g ON g.id_asignatura = a.id_asignatura
    JOIN periodo pe ON pe.id_periodo = g.id_periodo
    JOIN plan_estudio pl ON pl.id_asignatura = a.id_asignatura
    WHERE pe.nombre = '2026-2' AND pl.obligatoria = TRUE;

-- 50. Estudiantes con matrícula activa que no tienen calificación final en alguno de sus detalles.
--    π_{id_persona,nombres}((π_{id_detalle}(σ_{MATRICULA.estado='Activa'}(MATRICULA ⋈ DETALLE_MATRICULA)) − π_{id_detalle}(CALIFICACION)) ⋈ DETALLE_MATRICULA ⋈ MATRICULA ⋈ ESTUDIANTE ⋈ PERSONA)
--    Nota: La expresión original del documento resta a nivel de estudiante (quita a quien tenga cualquier nota). Para cumplir el enunciado ("en alguno de sus detalles") la diferencia debe hacerse a nivel de id_detalle, como se muestra aquí.
SELECT DISTINCT p.id_persona, p.nombres
    FROM matricula m JOIN estudiante e ON e.id_persona = m.id_persona_estudiante JOIN persona p ON p.id_persona = e.id_persona JOIN detalle_matricula dm ON dm.id_matricula = m.id_matricula
    WHERE m.estado = 'Activa'
    AND dm.id_detalle NOT IN (SELECT id_detalle FROM calificacion);
