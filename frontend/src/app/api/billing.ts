import { API_BASE_URL, request, unwrapList, type PaginatedResponse } from "./client";
import { getAuthToken } from "../auth/storage";

export type ChargeOrigin = "consulta" | "laboratorio" | "farmacia";
export type ChargeStatus = "pendiente" | "parcial" | "pagado";

export interface ChargeRecord {
  id_cargo: number;
  id_paciente: number;
  origen: ChargeOrigin;
  referencia_tipo: string;
  referencia_id: number;
  descripcion: string | null;
  subtotal: number;
  total: number;
  saldo: number;
  estado_pago: ChargeStatus;
  created_at: string;
  updated_at: string;
  paciente_nombre: string | null;
  paciente_dni: string | null;
  total_pagado: number;
}

export interface PaymentRecord {
  id_pago: number;
  id_paciente: number;
  id_cargo: number;
  monto: number;
  fecha_pago: string;
  metodo: string;
  referencia: string | null;
  observaciones: string | null;
  created_at: string;
  cargo_descripcion: string | null;
  cargo_origen: ChargeOrigin;
  cargo_total: number;
  cargo_saldo: number;
  cargo_estado_pago: ChargeStatus;
  paciente_nombre: string | null;
  paciente_dni: string | null;
}

export interface PaymentPayload {
  id_cargo: number;
  id_paciente?: number | null;
  monto: number;
  fecha_pago?: string | null;
  metodo: string;
  referencia?: string | null;
  observaciones?: string | null;
}

export interface PaymentCreationResponse {
  pago: PaymentRecord;
  cargo: ChargeRecord;
}

export interface FetchChargesParams {
  q?: string;
  id_paciente?: number | string;
  estado_pago?: ChargeStatus | string;
  origen?: ChargeOrigin | string;
}

export interface FetchPaymentsParams {
  id_paciente?: number | string;
  id_cargo?: number | string;
}

function buildQuery(params?: Record<string, string | number | undefined | null>) {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchCharges(params?: FetchChargesParams, signal?: AbortSignal) {
  const response = await request<ChargeRecord[] | PaginatedResponse<ChargeRecord>>(
    `/api/cargos${buildQuery(params)}`,
    { method: "GET", signal },
    "No se pudieron obtener los cargos."
  );

  return unwrapList(response);
}

export async function fetchPayments(params?: FetchPaymentsParams, signal?: AbortSignal) {
  const response = await request<PaymentRecord[] | PaginatedResponse<PaymentRecord>>(
    `/api/pagos${buildQuery(params)}`,
    { method: "GET", signal },
    "No se pudieron obtener los pagos."
  );

  return unwrapList(response);
}

export function createPayment(payload: PaymentPayload) {
  return request<PaymentCreationResponse>(
    "/api/pagos",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "No se pudo registrar el pago."
  );
}
export async function fetchAccountStatementPdf(idPaciente: number): Promise<Blob> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/cargos/estado-cuenta/${idPaciente}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = "No se pudo generar el estado de cuenta.";
    try {
      const data = await response.json();
      if (data && typeof data.message === "string") message = data.message;
    } catch {
      // la respuesta no era JSON; se usa el mensaje por defecto
    }
    throw new Error(message);
  }

  return response.blob();
}