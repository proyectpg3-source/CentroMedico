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
  id_producto: number | null;
  cantidad: number | null;
  producto_nombre: string | null;
  producto_codigo: string | null;
  producto_unidad: string | null;
  producto_stock: number | null;
  cantidad_dispensada: number;
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
  id_producto?: number | null;
  cantidad?: number | null;
}

export interface PharmacyProduct {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  stock: number;
  precio: number;
  vencimiento: string | null;
}

export interface FetchPrescriptionsParams {
  q?: string;
  id_visita?: number | string;
  id_paciente?: number | string;
  pendientes_dispensar?: boolean;
}

export type DispensationStatus = "sin_producto" | "pendiente" | "parcial" | "dispensada";

export const DISPENSATION_LABELS: Record<DispensationStatus, { label: string; className: string }> = {
  sin_producto: { label: "Sin vincular a farmacia", className: "bg-slate-100 text-slate-600" },
  pendiente: { label: "Pendiente de dispensar", className: "bg-amber-50 text-amber-700" },
  parcial: { label: "Dispensada parcialmente", className: "bg-sky-50 text-sky-700" },
  dispensada: { label: "Dispensada", className: "bg-emerald-50 text-emerald-700" },
};

export function getDispensationStatus(prescription: PrescriptionRecord): DispensationStatus {
  if (!prescription.id_producto || !prescription.cantidad) return "sin_producto";
  if (prescription.cantidad_dispensada <= 0) return "pendiente";
  return prescription.cantidad_dispensada >= prescription.cantidad ? "dispensada" : "parcial";
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

  if (params.pendientes_dispensar) {
    searchParams.set("pendientes_dispensar", "1");
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

export function dispensePrescription(id: number, cantidad?: number) {
  return request<PrescriptionRecord>(
    `/api/prescripciones/${id}/dispensar`,
    {
      method: "POST",
      body: JSON.stringify(cantidad ? { cantidad } : {}),
    },
    "No se pudo dispensar la prescripcion."
  );
}

export function fetchPharmacyProducts(signal?: AbortSignal) {
  return request<PharmacyProduct[]>(
    "/api/productos?tipo=farmacia",
    { method: "GET", signal },
    "No se pudo obtener el catalogo de farmacia."
  );
}
