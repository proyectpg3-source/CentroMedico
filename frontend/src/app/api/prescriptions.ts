import { request, unwrapList, type PaginatedResponse } from "./client";

export interface PrescriptionRecord {
  id_prescripcion: number;
  id_visita: number;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  instrucciones: string | null;
  costo: number;
  created_at: string;
  updated_at: string;
  id_paciente: number;
  id_medico: number;
  fecha_visita: string;
  paciente_nombre: string | null;
  paciente_dni: string | null;
  medico_nombre: string | null;
  medico_especialidad: string | null;
}

export interface PrescriptionPayload {
  id_visita: number;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  instrucciones?: string | null;
  costo?: number;
}

export interface FetchPrescriptionsParams {
  q?: string;
  id_visita?: number | string;
  id_paciente?: number | string;
}

function buildQuery(params?: FetchPrescriptionsParams) {
  const searchParams = new URLSearchParams();

  if (!params) {
    return "";
  }

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.id_visita) {
    searchParams.set("id_visita", String(params.id_visita));
  }

  if (params.id_paciente) {
    searchParams.set("id_paciente", String(params.id_paciente));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchPrescriptions(params?: FetchPrescriptionsParams, signal?: AbortSignal) {
  const response = await request<PrescriptionRecord[] | PaginatedResponse<PrescriptionRecord>>(
    `/api/prescripciones${buildQuery(params)}`,
    { method: "GET", signal },
    "No se pudieron obtener las prescripciones."
  );

  return unwrapList(response);
}

export function createPrescription(payload: PrescriptionPayload) {
  return request<PrescriptionRecord>(
    "/api/prescripciones",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "No se pudo registrar la prescripcion."
  );
}

export function updatePrescription(id: number, payload: PrescriptionPayload) {
  return request<PrescriptionRecord>(
    `/api/prescripciones/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar la prescripcion."
  );
}
