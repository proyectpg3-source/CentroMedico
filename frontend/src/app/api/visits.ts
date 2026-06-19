import { request, unwrapList, type PaginatedResponse } from "./client";

export interface VisitRecord {
  id_visita: number;
  id_cita: number | null;
  id_paciente: number;
  id_medico: number;
  fecha_visita: string;
  motivo: string;
  diagnostico: string;
  tratamiento: string | null;
  observaciones: string | null;
  costo_consulta: number;
  created_at: string;
  updated_at: string;
  paciente_nombre: string | null;
  paciente_dni: string | null;
  paciente_telefono: string | null;
  paciente_email: string | null;
  medico_nombre: string | null;
  medico_especialidad: string | null;
  medico_licencia: string | null;
  cita_fecha_hora: string | null;
  cita_estado: string | null;
  total_ordenes_laboratorio: number;
  total_prescripciones: number;
}

export interface VisitPayload {
  id_cita?: number | null;
  id_paciente?: number | null;
  id_medico?: number | null;
  fecha_visita?: string;
  motivo?: string;
  diagnostico: string;
  tratamiento?: string | null;
  observaciones?: string | null;
  costo_consulta?: number;
}

export interface FetchVisitsParams {
  q?: string;
  id_paciente?: number | string;
  id_medico?: number | string;
  id_cita?: number | string;
  dateFrom?: string;
  dateTo?: string;
}

function buildQuery(params?: FetchVisitsParams) {
  const searchParams = new URLSearchParams();

  if (!params) {
    return "";
  }

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.id_paciente) {
    searchParams.set("id_paciente", String(params.id_paciente));
  }

  if (params.id_medico) {
    searchParams.set("id_medico", String(params.id_medico));
  }

  if (params.id_cita) {
    searchParams.set("id_cita", String(params.id_cita));
  }

  if (params.dateFrom) {
    searchParams.set("dateFrom", params.dateFrom);
  }

  if (params.dateTo) {
    searchParams.set("dateTo", params.dateTo);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchVisits(params?: FetchVisitsParams, signal?: AbortSignal) {
  const response = await request<VisitRecord[] | PaginatedResponse<VisitRecord>>(
    `/api/visitas${buildQuery(params)}`,
    { method: "GET", signal },
    "No se pudieron obtener las visitas medicas."
  );

  return unwrapList(response);
}

export function fetchVisitById(id: number, signal?: AbortSignal) {
  return request<VisitRecord>(
    `/api/visitas/${id}`,
    { method: "GET", signal },
    "No se pudo obtener la visita medica."
  );
}

export function createVisit(payload: VisitPayload) {
  return request<VisitRecord>(
    "/api/visitas",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "No se pudo registrar la visita medica."
  );
}

export function updateVisit(id: number, payload: VisitPayload) {
  return request<VisitRecord>(
    `/api/visitas/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar la visita medica."
  );
}
