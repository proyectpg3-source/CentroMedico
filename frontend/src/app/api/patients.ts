import { request, unwrapList, type PaginatedResponse } from "./client";

export interface PatientRecord {
  id_paciente: number;
  nombre: string;
  dni: string;
  telefono: string | null;
  email: string | null;
  fecha_nacimiento: string | null;
  sexo: "femenino" | "masculino" | "otro" | "no_indicado" | null;
  residencia: string | null;
  contacto_emergencia: string | null;
  fecha_registro: string;
}

export interface PatientPayload {
  nombre: string;
  dni: string;
  telefono?: string | null;
  email?: string | null;
  fecha_nacimiento?: string | null;
  sexo?: "femenino" | "masculino" | "otro" | "no_indicado" | null;
  residencia?: string | null;
  contacto_emergencia?: string | null;
}

export async function fetchPatients(signal?: AbortSignal) {
  const response = await request<PatientRecord[] | PaginatedResponse<PatientRecord>>(
    "/api/pacientes",
    { method: "GET", signal },
    "No se pudieron obtener los pacientes."
  );

  return unwrapList(response);
}

export function createPatient(payload: PatientPayload) {
  return request<PatientRecord>(
    "/api/pacientes",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "No se pudo registrar el paciente."
  );
}

export function updatePatient(id: number, payload: PatientPayload) {
  return request<PatientRecord>(
    `/api/pacientes/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar el paciente."
  );
}

export function removePatient(id: number) {
  return request<{ message: string }>(
    `/api/pacientes/${id}`,
    {
      method: "DELETE",
    },
    "No se pudo eliminar el paciente."
  );
}
