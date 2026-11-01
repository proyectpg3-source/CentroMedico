import { request, unwrapList, type PaginatedResponse } from "./client";

export type AppointmentStatus =
  | "pendiente"
  | "confirmada"
  | "en_curso"
  | "completada"
  | "cancelada";

export interface AppointmentRecord {
  id_cita: number;
  id_paciente: number | null;
  id_medico: number | null;
  id_visita: number | null;
  fecha_hora: string;
  motivo: string | null;
  estado: AppointmentStatus;
  triaje_notas: string | null;
  prioridad_clinica: "baja" | "media" | "alta" | "critica";
  puntaje_prioridad: number;
  motivos_prioridad: string | null;
  nivel_propuesto?: "P1" | "P2" | "P3" | "P4" | null;
  prioridad_final?: "P1" | "P2" | "P3" | "P4" | null;
  estado_prioridad?: "propuesto" | "validado" | null;
  estado_propuesta?: string | null;
  hora_llegada: string | null;
  hora_inicio_atencion: string | null;
  hora_fin_atencion: string | null;
  paciente_nombre: string | null;
  paciente_dni: string | null;
  paciente_telefono: string | null;
  paciente_email: string | null;
  medico_nombre: string | null;
  medico_especialidad: string | null;
  medico_licencia: string | null;
}

export interface AppointmentPayload {
  registrar_llegada?: boolean;
  id_paciente: number;
  id_medico: number;
  fecha_hora: string;
  motivo?: string | null;
  triaje_notas?: string | null;
  estado?: AppointmentStatus;
}

export interface FetchAppointmentsParams {
  q?: string;
  estado?: string;
  id_medico?: number | string;
  id_paciente?: number | string;
  dateFrom?: string;
  dateTo?: string;
}

function buildAppointmentsQuery(params?: FetchAppointmentsParams) {
  const searchParams = new URLSearchParams();

  if (!params) {
    return "";
  }

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.estado) {
    searchParams.set("estado", params.estado);
  }

  if (params.id_medico) {
    searchParams.set("id_medico", String(params.id_medico));
  }

  if (params.id_paciente) {
    searchParams.set("id_paciente", String(params.id_paciente));
  }

  if (params.dateFrom) {
    searchParams.set("dateFrom", params.dateFrom);
  }

  if (params.dateTo) {
    searchParams.set("dateTo", params.dateTo);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function fetchAppointments(params?: FetchAppointmentsParams, signal?: AbortSignal) {
  const response = await request<AppointmentRecord[] | PaginatedResponse<AppointmentRecord>>(
    `/api/citas${buildAppointmentsQuery(params)}`,
    { method: "GET", signal },
    "No se pudieron obtener las citas."
  );

  return unwrapList(response);
}

export function createAppointment(payload: AppointmentPayload) {
  return request<AppointmentRecord>(
    "/api/citas",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "No se pudo registrar la cita."
  );
}

export function updateAppointment(id: number, payload: AppointmentPayload) {
  return request<AppointmentRecord>(
    `/api/citas/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar la cita."
  );
}

export function updateAppointmentStatus(id: number, estado: AppointmentStatus) {
  return request<AppointmentRecord>(
    `/api/citas/${id}/estado`,
    {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    },
    "No se pudo actualizar el estado de la cita."
  );
}

export function removeAppointment(id: number) {
  return request<{ message: string }>(
    `/api/citas/${id}`,
    {
      method: "DELETE",
    },
    "No se pudo eliminar la cita."
  );
}
