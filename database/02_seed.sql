-- =============================================================================
-- SIGAU — Script 02: datos de prueba
-- Los datos están pensados para que las 50 consultas del Anexo A devuelvan
-- resultados y para poder probar las reglas de negocio desde la API.
-- =============================================================================
USE sigau;

-- ---------------------------------------------------------------- PROGRAMA
INSERT INTO programa (id_programa, nombre, facultad, nivel) VALUES
 (1, 'Ingeniería de Sistemas',               'Facultad de Ingeniería', 'Profesional'),
 (2, 'Ingeniería Industrial',                'Facultad de Ingeniería', 'Profesional'),
 (3, 'Especialización en Analítica de Datos', 'Facultad de Ingeniería', 'Especialización');

-- ---------------------------------------------------------------- PERSONA
INSERT INTO persona (id_persona, tipo_documento, numero_documento, nombres, apellidos, email, telefono) VALUES
 ( 1, 'CC', '1001001001', 'Laura',     'Gómez Ruiz',      'laura.gomez@sigau.edu.co',      '3001112233'),
 ( 2, 'CC', '1001001002', 'Andrés',    'Rodríguez Peña',  'andres.rodriguez@sigau.edu.co', '3001112234'),
 ( 3, 'CC', '1001001003', 'Camila',    'Pérez Vargas',    'camila.perez@sigau.edu.co',     NULL),
 ( 4, 'TI', '1001001004', 'Santiago',  'Martínez Díaz',   'santiago.martinez@sigau.edu.co','3001112236'),
 ( 5, 'CC', '1001001005', 'Valentina', 'López Castaño',   'valentina.lopez@sigau.edu.co',  '3001112237'),
 ( 6, 'CC', '1001001006', 'Mateo',     'Hernández Gil',   'mateo.hernandez@sigau.edu.co',  NULL),
 ( 7, 'CC', '79000007',   'Christian', 'Duarte',          'christian.duarte@sigau.edu.co', '3105550007'),
 ( 8, 'CC', '52000008',   'María',     'Torres Acosta',   'maria.torres@sigau.edu.co',     '3105550008'),
 ( 9, 'CC', '80000009',   'Jorge',     'Ramírez Mejía',   'jorge.ramirez@sigau.edu.co',    '3105550009'),
 (10, 'CC', '52000010',   'Diana',     'Castro Rojas',    'diana.castro@sigau.edu.co',     '3105550010'),
 (11, 'CE', 'E-0000011',  'Ricardo',   'Silva Montoya',   'ricardo.silva@sigau.edu.co',    NULL),
 (12, 'CC', '1001001012', 'Paula',     'Moreno Salazar',  'paula.moreno@sigau.edu.co',     '3001112238');

-- ---------------------------------------------------------------- ESTUDIANTE (subtipo)
INSERT INTO estudiante (id_persona, id_programa, fecha_ingreso, estado) VALUES
 ( 1, 1, '2025-07-28', 'Activo'),
 ( 2, 1, '2025-07-28', 'Activo'),
 ( 3, 2, '2025-07-28', 'Activo'),
 ( 4, 1, '2026-07-27', 'Activo'),    -- sin matrícula (consulta 37)
 ( 5, 1, '2025-07-28', 'Activo'),
 ( 6, 2, '2025-07-28', 'Inactivo'),
 (10, 3, '2026-01-26', 'Activo'),    -- también es docente (consulta 32)
 (12, 1, '2025-07-28', 'Activo');

-- ---------------------------------------------------------------- DOCENTE (subtipo)
INSERT INTO docente (id_persona, especialidad, estado) VALUES
 ( 7, 'Bases de datos',        'Activo'),
 ( 8, 'Programación',          'Activo'),
 ( 9, 'Matemáticas',           'Activo'),
 (10, 'Analítica de datos',    'Activo'),
 (11, 'Ingeniería de software','Activo');   -- sin grupos (consulta 40)

-- ---------------------------------------------------------------- ASIGNATURA
INSERT INTO asignatura (id_asignatura, codigo, nombre, creditos) VALUES
 ( 1, 'MAT101', 'Cálculo Diferencial',          4),
 ( 2, 'PRG101', 'Programación I',               3),
 ( 3, 'PRG102', 'Programación II',              3),
 ( 4, 'BD101',  'Bases de Datos 1',             4),
 ( 5, 'BD102',  'Bases de Datos 2',             3),
 ( 6, 'EST101', 'Estadística',                  3),
 ( 7, 'ING101', 'Inglés I',                     2),
 ( 8, 'ETI101', 'Ética Profesional',            2),   -- en ningún plan (consulta 34)
 ( 9, 'ANA501', 'Analítica Avanzada',           3),
 (10, 'MAT102', 'Cálculo Integral',             4),
 (11, 'IND201', 'Investigación de Operaciones', 4);

-- ---------------------------------------------------------------- PLAN_ESTUDIO
INSERT INTO plan_estudio (id_programa, id_asignatura, semestre, obligatoria) VALUES
 -- Ingeniería de Sistemas
 (1, 1, 1, TRUE), (1, 2, 1, TRUE), (1, 7, 1, FALSE), (1, 3, 2, TRUE), (1, 10, 2, TRUE),
 (1, 4, 3, TRUE), (1, 6, 3, TRUE), (1, 5, 4, TRUE),
 -- Ingeniería Industrial
 (2, 1, 1, TRUE), (2, 7, 1, FALSE), (2, 2, 2, TRUE), (2, 6, 2, TRUE), (2, 10, 2, TRUE), (2, 11, 3, TRUE),
 -- Especialización en Analítica de Datos
 (3, 9, 1, TRUE), (3, 6, 1, FALSE);

-- ---------------------------------------------------------------- PRERREQUISITO
INSERT INTO prerrequisito (id_asignatura, id_asignatura_requerida) VALUES
 ( 3, 2),   -- PRG102 requiere PRG101
 ( 4, 2),   -- BD101  requiere PRG101
 ( 5, 4),   -- BD102  requiere BD101
 ( 6, 1),   -- EST101 requiere MAT101
 (10, 1),   -- MAT102 requiere MAT101
 (11, 1);   -- IND201 requiere MAT101

-- ---------------------------------------------------------------- PERIODO
INSERT INTO periodo (id_periodo, nombre, fecha_inicio, fecha_fin, estado) VALUES
 (1, '2026-1', '2026-01-26', '2026-06-06', 'Cerrado'),
 (2, '2026-2', '2026-07-27', '2026-11-28', 'Activo'),
 (3, '2027-1', '2027-01-25', '2027-06-05', 'Planeado');

-- ---------------------------------------------------------------- AULA
INSERT INTO aula (id_aula, codigo, capacidad, tipo) VALUES
 (1, 'A-101',   40,  'Salón'),
 (2, 'A-102',   35,  'Salón'),
 (3, 'LAB-201', 25,  'Laboratorio'),
 (4, 'LAB-202', 20,  'Laboratorio'),
 (5, 'B-301',   15,  'Salón'),
 (6, 'AUD-01',  120, 'Auditorio');     -- sin horarios (consulta 36)

-- ---------------------------------------------------------------- GRUPO
INSERT INTO grupo (id_grupo, id_asignatura, id_docente, id_periodo, codigo, cupo, modalidad) VALUES
 -- 2026-1
 ( 1,  1, 9, 1, 'G1', 35, 'Presencial'),
 ( 2,  2, 8, 1, 'G1', 25, 'Presencial'),
 ( 3,  7, 8, 1, 'G1', 30, 'Virtual'),
 -- 2026-2
 ( 4,  4, 7, 2, 'G1', 25, 'Presencial'),
 ( 5,  4, 7, 2, 'G2', 25, 'Híbrida'),
 ( 6,  3, 8, 2, 'G1', 30, 'Presencial'),
 ( 7,  6, 9, 2, 'G1', 30, 'Presencial'),
 ( 8, 10, 9, 2, 'G1', 35, 'Presencial'),
 ( 9,  9,10, 2, 'G1', 20, 'Virtual'),
 (10,  5, 7, 2, 'G1', 25, 'Presencial'),   -- sin inscritos (consulta 35)
 (11, 11, 9, 2, 'G1', 30, 'Presencial'),
 (12,  1, 9, 2, 'G1', 30, 'Presencial');   -- programado en aula de 15 (consulta 47)

-- ---------------------------------------------------------------- HORARIO
INSERT INTO horario (id_horario, id_grupo, id_aula, dia_semana, hora_inicio, hora_fin) VALUES
 -- 2026-1
 ( 1,  1, 1, 'Lunes',     '07:00', '09:00'),
 ( 2,  1, 1, 'Miércoles', '07:00', '09:00'),
 ( 3,  2, 3, 'Martes',    '09:00', '11:00'),
 ( 4,  2, 3, 'Jueves',    '09:00', '11:00'),
 ( 5,  3, 2, 'Viernes',   '18:00', '20:00'),
 -- 2026-2
 ( 6,  4, 3, 'Lunes',     '09:00', '11:00'),
 ( 7,  4, 3, 'Miércoles', '09:00', '11:00'),
 ( 8,  5, 3, 'Lunes',     '18:00', '20:00'),
 ( 9,  5, 3, 'Jueves',    '18:30', '20:30'),
 (10,  6, 2, 'Martes',    '07:00', '09:00'),
 (11,  6, 2, 'Jueves',    '07:00', '09:00'),
 (12,  7, 1, 'Martes',    '11:00', '13:00'),
 (13,  7, 1, 'Viernes',   '07:00', '09:00'),
 (14,  8, 1, 'Lunes',     '07:00', '09:00'),
 (15,  8, 1, 'Miércoles', '07:00', '09:00'),
 (16,  9, 4, 'Sábado',    '08:00', '12:00'),
 (17, 10, 3, 'Martes',    '14:00', '16:00'),
 (18, 11, 2, 'Lunes',     '11:00', '13:00'),
 (19, 11, 2, 'Miércoles', '11:00', '13:00'),
 -- Dato heredado/inconsistente a propósito: la API NO permitiría crearlo
 -- (cupo 30 > capacidad 15). Sirve para la consulta 47.
 (20, 12, 5, 'Jueves',    '14:00', '16:00');

-- ---------------------------------------------------------------- MATRICULA
INSERT INTO matricula (id_matricula, id_persona_estudiante, id_periodo, fecha_matricula, estado) VALUES
 -- 2026-1 (cerrado)
 ( 1,  1, 1, '2026-01-15', 'Finalizada'),
 ( 2,  2, 1, '2026-01-15', 'Finalizada'),
 ( 3,  3, 1, '2026-01-16', 'Finalizada'),
 ( 4,  5, 1, '2026-01-16', 'Finalizada'),
 ( 5, 12, 1, '2026-01-17', 'Finalizada'),
 ( 6,  6, 1, '2026-01-17', 'Finalizada'),
 -- 2026-2 (activo)
 ( 7,  1, 2, '2026-07-15', 'Activa'),
 ( 8,  2, 2, '2026-07-15', 'Activa'),
 ( 9,  3, 2, '2026-07-16', 'Activa'),
 (10,  5, 2, '2026-07-16', 'Activa'),
 (11, 10, 2, '2026-07-17', 'Activa'),
 (12, 12, 2, '2026-07-17', 'Activa');

-- ---------------------------------------------------------------- DETALLE_MATRICULA
INSERT INTO detalle_matricula (id_detalle, id_matricula, id_grupo, fecha_registro, estado) VALUES
 -- 2026-1
 ( 1, 1, 1, '2026-01-15', 'Finalizado'),
 ( 2, 1, 2, '2026-01-15', 'Finalizado'),
 ( 3, 1, 3, '2026-01-15', 'Finalizado'),
 ( 4, 2, 1, '2026-01-15', 'Finalizado'),
 ( 5, 2, 2, '2026-01-15', 'Finalizado'),
 ( 6, 3, 1, '2026-01-16', 'Finalizado'),
 ( 7, 4, 2, '2026-01-16', 'Finalizado'),
 ( 8, 4, 1, '2026-01-16', 'Finalizado'),
 ( 9, 5, 2, '2026-01-17', 'Finalizado'),
 (10, 5, 1, '2026-01-17', 'Finalizado'),
 (11, 6, 1, '2026-01-17', 'Finalizado'),
 -- 2026-2
 (12,  7,  4, '2026-07-15', 'Inscrito'),
 (13,  7,  6, '2026-07-15', 'Inscrito'),
 (14,  7,  7, '2026-07-15', 'Inscrito'),
 (15,  7,  8, '2026-07-15', 'Inscrito'),
 (16,  8,  5, '2026-07-15', 'Inscrito'),
 (17,  8, 12, '2026-07-15', 'Inscrito'),
 (18,  9,  7, '2026-07-16', 'Inscrito'),
 (19,  9, 11, '2026-07-16', 'Inscrito'),
 (20, 10,  4, '2026-07-16', 'Inscrito'),
 (21, 10,  6, '2026-07-16', 'Inscrito'),
 (22, 11,  9, '2026-07-17', 'Inscrito'),
 (23, 12,  7, '2026-07-17', 'Inscrito');

-- ---------------------------------------------------------------- CALIFICACION
INSERT INTO calificacion (id_detalle, nota_final, fecha_registro, observacion) VALUES
 -- 2026-1
 ( 1, 4.20, '2026-06-01', NULL),
 ( 2, 4.50, '2026-06-01', 'Excelente desempeño'),
 ( 3, 3.80, '2026-06-01', NULL),
 ( 4, 2.50, '2026-06-01', 'Debe repetir la asignatura'),
 ( 5, 3.60, '2026-06-01', NULL),
 ( 6, 3.20, '2026-06-02', NULL),
 ( 7, 4.80, '2026-06-02', NULL),
 ( 8, 3.00, '2026-06-02', NULL),
 ( 9, 2.80, '2026-06-02', NULL),
 (10, 4.00, '2026-06-02', NULL),
 (11, 1.80, '2026-06-02', NULL),
 -- 2026-2 (algunas notas ya registradas; el resto sigue pendiente — consulta 50)
 (12, 4.60, '2026-11-02', NULL),
 (20, 4.10, '2026-11-02', NULL),
 (21, 2.90, '2026-11-03', NULL);
