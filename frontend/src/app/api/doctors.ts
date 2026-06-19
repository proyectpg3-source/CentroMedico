import { request, unwrapList, type PaginatedResponse } from "./client";

export interface DoctorRecord {
  id_medico: number;
  nombre: string;
  especialidad: string;
  licencia: string | null;
  total_citas?: number;
}

export interface DoctorPayload {
  nombre: string;
  especialidad: string;
  licencia?: string | null;
}

export interface FetchDoctorsParams {
  q?: string;
  especialidad?: string;
}

function buildDoctorsQuery(params?: FetchDoctorsParams) {
  const searchParams = new URLSearchParams();

  if (params?.q) {
    searchParams.set("q", params.q);
  }

  if (params?.especialidad) {
    searchParams.set("especialidad", params.especialidad);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function fetchDoctors(params?: FetchDoctorsParams, signal?: AbortSignal) {
  const response = await request<DoctorRecord[] | PaginatedResponse<DoctorRecord>>(
    `/api/medicos${buildDoctorsQuery(params)}`,
    { method: "GET", signal },
    "No se pudieron obtener los medicos."
  );

  return unwrapList(response);
}

export function createDoctor(payload: DoctorPayload) {
  return request<DoctorRecord>(
    "/api/medicos",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "No se pudo registrar el medico."
  );
}

export function updateDoctor(id: number, payload: DoctorPayload) {
  return request<DoctorRecord>(
    `/api/medicos/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar el medico."
  );
}

export function removeDoctor(id: number) {
  return request<{ message: string }>(
    `/api/medicos/${id}`,
    {
      method: "DELETE",
    },
    "No se pudo eliminar el medico."
  );
}
