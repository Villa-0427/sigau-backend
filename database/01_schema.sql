-- =============================================================================
-- SIGAU — Sistema de Gestión Académica Universitaria
-- Script 01: esquema físico (MySQL 8.0.16+ — requiere soporte de CHECK)
-- Basado en el modelo relacional y el diccionario de datos de la Fase 1.
-- =============================================================================

DROP DATABASE IF EXISTS sigau;
CREATE DATABASE sigau CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE sigau;

-- -----------------------------------------------------------------------------
-- PERSONA (supertipo)  — RB-01, RB-02, S-01
-- -----------------------------------------------------------------------------
CREATE TABLE persona (
    id_persona        INT          NOT NULL AUTO_INCREMENT,
    tipo_documento    VARCHAR(15)  NOT NULL,
    numero_documento  VARCHAR(25)  NOT NULL,
    nombres           VARCHAR(80)  NOT NULL,
    apellidos         VARCHAR(80)  NOT NULL,
    email             VARCHAR(120) NOT NULL,
    telefono          VARCHAR(25)  NULL,
    CONSTRAINT pk_persona           PRIMARY KEY (id_persona),
    CONSTRAINT uq_persona_documento UNIQUE (tipo_documento, numero_documento),
    CONSTRAINT uq_persona_email     UNIQUE (email),
    CONSTRAINT ck_persona_tipo_doc  CHECK (tipo_documento IN ('CC', 'TI', 'CE', 'PA'))
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- PROGRAMA
-- -----------------------------------------------------------------------------
CREATE TABLE programa (
    id_programa  INT          NOT NULL AUTO_INCREMENT,
    nombre       VARCHAR(120) NOT NULL,
    facultad     VARCHAR(120) NOT NULL,
    nivel        VARCHAR(30)  NOT NULL,
    CONSTRAINT pk_programa        PRIMARY KEY (id_programa),
    CONSTRAINT uq_programa_nombre UNIQUE (nombre),
    CONSTRAINT ck_programa_nivel  CHECK (nivel IN ('Técnico', 'Tecnológico', 'Profesional',
                                                   'Especialización', 'Maestría', 'Doctorado'))
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- ESTUDIANTE (subtipo de PERSONA) — S-02, S-03, RB-03
-- -----------------------------------------------------------------------------
CREATE TABLE estudiante (
    id_persona     INT         NOT NULL,
    id_programa    INT         NOT NULL,
    fecha_ingreso  DATE        NOT NULL,
    estado         VARCHAR(20) NOT NULL DEFAULT 'Activo',
    CONSTRAINT pk_estudiante          PRIMARY KEY (id_persona),
    CONSTRAINT fk_estudiante_persona  FOREIGN KEY (id_persona)  REFERENCES persona (id_persona)  ON DELETE CASCADE,
    CONSTRAINT fk_estudiante_programa FOREIGN KEY (id_programa) REFERENCES programa (id_programa),
    CONSTRAINT ck_estudiante_estado   CHECK (estado IN ('Activo', 'Inactivo', 'Graduado', 'Retirado'))
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- DOCENTE (subtipo de PERSONA) — S-02
-- -----------------------------------------------------------------------------
CREATE TABLE docente (
    id_persona    INT          NOT NULL,
    especialidad  VARCHAR(120) NULL,
    estado        VARCHAR(20)  NOT NULL DEFAULT 'Activo',
    CONSTRAINT pk_docente         PRIMARY KEY (id_persona),
    CONSTRAINT fk_docente_persona FOREIGN KEY (id_persona) REFERENCES persona (id_persona) ON DELETE CASCADE,
    CONSTRAINT ck_docente_estado  CHECK (estado IN ('Activo', 'Inactivo'))
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- ASIGNATURA — S-04
-- -----------------------------------------------------------------------------
CREATE TABLE asignatura (
    id_asignatura  INT              NOT NULL AUTO_INCREMENT,
    codigo         VARCHAR(20)      NOT NULL,
    nombre         VARCHAR(120)     NOT NULL,
    creditos       TINYINT UNSIGNED NOT NULL,
    CONSTRAINT pk_asignatura          PRIMARY KEY (id_asignatura),
    CONSTRAINT uq_asignatura_codigo   UNIQUE (codigo),
    CONSTRAINT ck_asignatura_creditos CHECK (creditos > 0)
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- PLAN_ESTUDIO (asociativa PROGRAMA N:M ASIGNATURA) — S-05, RB-04, RB-05
-- -----------------------------------------------------------------------------
CREATE TABLE plan_estudio (
    id_programa    INT              NOT NULL,
    id_asignatura  INT              NOT NULL,
    semestre       TINYINT UNSIGNED NOT NULL,
    obligatoria    BOOLEAN          NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_plan_estudio            PRIMARY KEY (id_programa, id_asignatura),
    CONSTRAINT fk_plan_estudio_programa   FOREIGN KEY (id_programa)   REFERENCES programa (id_programa)     ON DELETE CASCADE,
    CONSTRAINT fk_plan_estudio_asignatura FOREIGN KEY (id_asignatura) REFERENCES asignatura (id_asignatura) ON DELETE CASCADE,
    CONSTRAINT ck_plan_estudio_semestre   CHECK (semestre > 0)
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- PERIODO — S-14
-- -----------------------------------------------------------------------------
CREATE TABLE periodo (
    id_periodo    INT         NOT NULL AUTO_INCREMENT,
    nombre        VARCHAR(40) NOT NULL,
    fecha_inicio  DATE        NOT NULL,
    fecha_fin     DATE        NOT NULL,
    estado        VARCHAR(20) NOT NULL DEFAULT 'Planeado',
    CONSTRAINT pk_periodo        PRIMARY KEY (id_periodo),
    CONSTRAINT uq_periodo_nombre UNIQUE (nombre),
    CONSTRAINT ck_periodo_fechas CHECK (fecha_inicio < fecha_fin),
    CONSTRAINT ck_periodo_estado CHECK (estado IN ('Planeado', 'Activo', 'Cerrado'))
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- AULA — S-15, RB-12
-- -----------------------------------------------------------------------------
CREATE TABLE aula (
    id_aula    INT               NOT NULL AUTO_INCREMENT,
    codigo     VARCHAR(20)       NOT NULL,
    capacidad  SMALLINT UNSIGNED NOT NULL,
    tipo       VARCHAR(30)       NOT NULL,
    CONSTRAINT pk_aula           PRIMARY KEY (id_aula),
    CONSTRAINT uq_aula_codigo    UNIQUE (codigo),
    CONSTRAINT ck_aula_capacidad CHECK (capacidad > 0),
    CONSTRAINT ck_aula_tipo      CHECK (tipo IN ('Salón', 'Laboratorio', 'Auditorio', 'Sala de cómputo'))
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- GRUPO — S-06, RB-06, RB-07, RB-12
-- -----------------------------------------------------------------------------
CREATE TABLE grupo (
    id_grupo       INT               NOT NULL AUTO_INCREMENT,
    id_asignatura  INT               NOT NULL,
    id_docente     INT               NOT NULL,
    id_periodo     INT               NOT NULL,
    codigo         VARCHAR(15)       NOT NULL,
    cupo           SMALLINT UNSIGNED NOT NULL,
    modalidad      VARCHAR(20)       NOT NULL,
    CONSTRAINT pk_grupo            PRIMARY KEY (id_grupo),
    CONSTRAINT uq_grupo_codigo     UNIQUE (id_periodo, id_asignatura, codigo),
    CONSTRAINT fk_grupo_asignatura FOREIGN KEY (id_asignatura) REFERENCES asignatura (id_asignatura),
    CONSTRAINT fk_grupo_docente    FOREIGN KEY (id_docente)    REFERENCES docente (id_persona),
    CONSTRAINT fk_grupo_periodo    FOREIGN KEY (id_periodo)    REFERENCES periodo (id_periodo),
    CONSTRAINT ck_grupo_cupo       CHECK (cupo > 0),
    CONSTRAINT ck_grupo_modalidad  CHECK (modalidad IN ('Presencial', 'Virtual', 'Híbrida'))
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- HORARIO — S-07, RB-11
-- -----------------------------------------------------------------------------
CREATE TABLE horario (
    id_horario   INT         NOT NULL AUTO_INCREMENT,
    id_grupo     INT         NOT NULL,
    id_aula      INT         NOT NULL,
    dia_semana   VARCHAR(12) NOT NULL,
    hora_inicio  TIME        NOT NULL,
    hora_fin     TIME        NOT NULL,
    CONSTRAINT pk_horario       PRIMARY KEY (id_horario),
    CONSTRAINT fk_horario_grupo FOREIGN KEY (id_grupo) REFERENCES grupo (id_grupo) ON DELETE CASCADE,
    CONSTRAINT fk_horario_aula  FOREIGN KEY (id_aula)  REFERENCES aula (id_aula),
    CONSTRAINT ck_horario_dia   CHECK (dia_semana IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')),
    CONSTRAINT ck_horario_horas CHECK (hora_inicio < hora_fin),
    INDEX ix_horario_aula_dia (id_aula, dia_semana)
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- MATRICULA (cabecera) — S-08, RB-08
-- -----------------------------------------------------------------------------
CREATE TABLE matricula (
    id_matricula           INT         NOT NULL AUTO_INCREMENT,
    id_persona_estudiante  INT         NOT NULL,
    id_periodo             INT         NOT NULL,
    fecha_matricula        DATE        NOT NULL,
    estado                 VARCHAR(20) NOT NULL DEFAULT 'Activa',
    CONSTRAINT pk_matricula                    PRIMARY KEY (id_matricula),
    CONSTRAINT uq_matricula_estudiante_periodo UNIQUE (id_persona_estudiante, id_periodo),
    CONSTRAINT fk_matricula_estudiante         FOREIGN KEY (id_persona_estudiante) REFERENCES estudiante (id_persona),
    CONSTRAINT fk_matricula_periodo            FOREIGN KEY (id_periodo)            REFERENCES periodo (id_periodo),
    CONSTRAINT ck_matricula_estado             CHECK (estado IN ('Activa', 'Cancelada', 'Finalizada'))
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- DETALLE_MATRICULA (asociativa MATRICULA N:M GRUPO) — S-09, S-10, RB-09
-- -----------------------------------------------------------------------------
CREATE TABLE detalle_matricula (
    id_detalle      INT         NOT NULL AUTO_INCREMENT,
    id_matricula    INT         NOT NULL,
    id_grupo        INT         NOT NULL,
    fecha_registro  DATE        NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'Inscrito',
    CONSTRAINT pk_detalle_matricula        PRIMARY KEY (id_detalle),
    CONSTRAINT uq_detalle_matricula_grupo  UNIQUE (id_matricula, id_grupo),
    CONSTRAINT fk_detalle_matricula        FOREIGN KEY (id_matricula) REFERENCES matricula (id_matricula) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_grupo            FOREIGN KEY (id_grupo)     REFERENCES grupo (id_grupo),
    CONSTRAINT ck_detalle_estado           CHECK (estado IN ('Inscrito', 'Retirado', 'Finalizado'))
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- CALIFICACION (1 : 0..1 con DETALLE_MATRICULA) — S-11, S-12, RB-10
-- -----------------------------------------------------------------------------
CREATE TABLE calificacion (
    id_detalle      INT          NOT NULL,
    nota_final      DECIMAL(3,2) NOT NULL,
    fecha_registro  DATE         NOT NULL,
    observacion     VARCHAR(250) NULL,
    CONSTRAINT pk_calificacion         PRIMARY KEY (id_detalle),
    CONSTRAINT fk_calificacion_detalle FOREIGN KEY (id_detalle) REFERENCES detalle_matricula (id_detalle) ON DELETE CASCADE,
    CONSTRAINT ck_calificacion_nota    CHECK (nota_final BETWEEN 0.00 AND 5.00)
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- PRERREQUISITO (asociativa recursiva ASIGNATURA N:M ASIGNATURA) — S-13, RB-13
-- Nota: MySQL no permite acciones referenciales (CASCADE) sobre columnas usadas
-- en un CHECK, por eso estas FK quedan con la acción por defecto (RESTRICT).
-- -----------------------------------------------------------------------------
CREATE TABLE prerrequisito (
    id_asignatura            INT NOT NULL,
    id_asignatura_requerida  INT NOT NULL,
    CONSTRAINT pk_prerrequisito            PRIMARY KEY (id_asignatura, id_asignatura_requerida),
    CONSTRAINT fk_prerrequisito_asignatura FOREIGN KEY (id_asignatura)           REFERENCES asignatura (id_asignatura),
    CONSTRAINT fk_prerrequisito_requerida  FOREIGN KEY (id_asignatura_requerida) REFERENCES asignatura (id_asignatura),
    CONSTRAINT ck_prerrequisito_distintas  CHECK (id_asignatura <> id_asignatura_requerida)
) ENGINE = InnoDB;
