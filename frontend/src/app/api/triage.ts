import { request, unwrapList, type PaginatedResponse } from "./client";
import type { ClinicalPriority, PriorityEvidence } from "./analysis";

export interface TriageRecord {
  evidencia_priorizacion?: PriorityEvidence;
  id_triaje: number;
  id_cita: number;
  id_paciente: number;
  fecha_triaje: string;
  motivo_consulta: string;
  historia_enfermedad_actual: string | null;
  antecedentes_relevantes: string | null;
  alergias_referidas: string | null;
  presion_arterial: string | null;
  frecuencia_cardiaca: number | null;
  frecuencia_respiratoria: number | null;
  temperatura: number | string | null;
  saturacion_oxigeno: number | null;
  peso: number | string | null;
  observaciones: string | null;
  prioridad_clinica: ClinicalPriority;
  puntaje_prioridad: number;
  motivos_prioridad: string | null;
  fecha_hora: string;
  cita_estado: string;
  id_medico: number | null;
  paciente_nombre: string | null;
  paciente_dni: string | null;
  paciente_telefono: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  residencia: string | null;
  medico_nombre: string | null;
  medico_especialidad: string | null;
}

export interface TriagePayload {
  id_cita: number;
  motivo_consulta: string;
  historia_enfermedad_actual?: string | null;
  antecedentes_relevantes?: string | null;
  alergias_referidas?: string | null;
  presion_arterial?: string | null;
  frecuencia_cardiaca?: number | null;
  frecuencia_respiratoria?: number | null;
  temperatura?: number | null;
  saturacion_oxigeno?: number | null;
  peso?: number | null;
  observaciones?: string | null;
}

export async function fetchTriages(signal?: AbortSignal) {
  const response = await request<TriageRecord[] | PaginatedResponse<TriageRecord>>(
    "/api/triajes",
    { method: "GET", signal },
    "No se pudieron cargar los triajes."
  );
  return unwrapList(response);
}

export function saveTriage(payload: TriagePayload) {
  return request<TriageRecord>(
    "/api/triajes",
    { method: "POST", body: JSON.stringify(payload) },
    "No se pudo guardar el triaje."
  );
}
