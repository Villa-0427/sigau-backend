/** Tipos que reflejan las filas de las 14 tablas del modelo relacional. */
export interface Persona {
  id_persona: number;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string | null;
}

export interface Estudiante {
  id_persona: number;
  id_programa: number;
  fecha_ingreso: string;
  estado: string;
}

export interface Docente {
  id_persona: number;
  especialidad: string | null;
  estado: string;
}

export interface Programa {
  id_programa: number;
  nombre: string;
  facultad: string;
  nivel: string;
}

export interface Asignatura {
  id_asignatura: number;
  codigo: string;
  nombre: string;
  creditos: number;
}

export interface PlanEstudio {
  id_programa: number;
  id_asignatura: number;
  semestre: number;
  obligatoria: number | boolean;
}

export interface Periodo {
  id_periodo: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

export interface Aula {
  id_aula: number;
  codigo: string;
  capacidad: number;
  tipo: string;
}

export interface Grupo {
  id_grupo: number;
  id_asignatura: number;
  id_docente: number;
  id_periodo: number;
  codigo: string;
  cupo: number;
  modalidad: string;
}

export interface Horario {
  id_horario: number;
  id_grupo: number;
  id_aula: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface Matricula {
  id_matricula: number;
  id_persona_estudiante: number;
  id_periodo: number;
  fecha_matricula: string;
  estado: string;
}

export interface DetalleMatricula {
  id_detalle: number;
  id_matricula: number;
  id_grupo: number;
  fecha_registro: string;
  estado: string;
}

export interface Calificacion {
  id_detalle: number;
  nota_final: number;
  fecha_registro: string;
  observacion: string | null;
}

export interface Prerrequisito {
  id_asignatura: number;
  id_asignatura_requerida: number;
}
