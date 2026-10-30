import { request } from "./client";

export type ClinicalPriority = "baja" | "media" | "alta" | "critica";

export interface PriorityEvidence {
  estado_datos: "requiere_revision" | "incompletos" | "registrados";
  signos_registrados: string[];
  datos_faltantes: string[];
  datos_invalidos: string[];
  visitas_historicas_consultadas: number | null;
  requiere_validacion_clinica: boolean;
  alcance: string;
}

export interface PriorityQueueRecord {
  evidencia_priorizacion?: PriorityEvidence;
  id_cita: number;
  id_paciente: number;
  id_medico: number;
  fecha_hora: string;
  motivo: string | null;
  estado: string;
  prioridad_clinica: ClinicalPriority;
  puntaje_prioridad: number;
  motivos_prioridad: string | null;
  triaje_notas: string | null;
  hora_llegada: string | null;
  hora_inicio_atencion: string | null;
  hora_fin_atencion: string | null;
  minutos_espera: number;
  vencida?: boolean;
  paciente_nombre: string | null;
  paciente_dni: string | null;
  paciente_telefono: string | null;
  medico_nombre: string | null;
  medico_especialidad: string | null;
  visitas_previas: number;
  ultima_visita: string | null;
}

export interface AnalysisIndicators {
  citas_activas: number;
  citas_alta_prioridad: number;
  espera_promedio_minutos: number;
  diagnosticos_frecuentes: Array<{
    diagnostico: string;
    total: number;
  }>;
  motivos_frecuentes: Array<{
    motivo: string;
    total: number;
  }>;
}

export interface PrioritySimulationPayload {
  motivo_consulta?: string | null;
  historia_enfermedad_actual?: string | null;
  antecedentes_relevantes?: string | null;
  alergias_referidas?: string | null;
  presion_arterial?: string | null;
  frecuencia_cardiaca?: number | null;
  frecuencia_respiratoria?: number | null;
  temperatura?: number | null;
  saturacion_oxigeno?: number | null;
  id_paciente?: number | null;
  motivo?: string | null;
  triaje_notas?: string | null;
  diagnostico?: string | null;
  tratamiento?: string | null;
  observaciones?: string | null;
}

export interface PrioritySimulationResult {
  evidencia_priorizacion?: PriorityEvidence;
  fuente_prioridad?: string;
  advertencia_microservicio?: string;
  prioridad_clinica: ClinicalPriority;
  puntaje_prioridad: number;
  motivos_prioridad: string;
}

export function fetchPriorityQueue(signal?: AbortSignal) {
  return request<PriorityQueueRecord[]>(
    "/api/analisis/priorizacion",
    { method: "GET", signal },
    "No se pudo cargar la cola priorizada."
  );
}

export function fetchAnalysisIndicators(signal?: AbortSignal) {
  return request<AnalysisIndicators>(
    "/api/analisis/indicadores",
    { method: "GET", signal },
    "No se pudieron cargar los indicadores de analisis."
  );
}

export function simulatePriority(payload: PrioritySimulationPayload) {
  return request<PrioritySimulationResult>(
    "/api/analisis/priorizacion/simular",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "No se pudo simular la prioridad clinica."
  );
}

export function recalculatePriorityQueue() {
  return request<{ total_recalculadas: number }>(
    "/api/analisis/priorizacion/recalcular",
    { method: "POST" },
    "No se pudo recalcular la cola priorizada."
  );
}
