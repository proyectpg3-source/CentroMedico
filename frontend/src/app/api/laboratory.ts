import { request, unwrapList, type PaginatedResponse } from "./client";

export type LaboratoryOrderStatus =
  | "pendiente"
  | "en_proceso"
  | "resultado_cargado"
  | "validado";

export type LaboratoryPriority = "normal" | "alta" | "urgente";

export interface LabOrderRecord {
  id_orden: number;
  id_paciente: number;
  id_cita: number | null;
  id_visita: number | null;
  examen: string;
  prioridad: LaboratoryPriority;
  estado: LaboratoryOrderStatus;
  costo: number;
  created_at: string;
  updated_at: string;
  paciente_nombre: string | null;
  paciente_dni: string | null;
  paciente_telefono: string | null;
  paciente_email: string | null;
  fecha_visita: string | null;
  visita_diagnostico: string | null;
  medico_nombre: string | null;
  medico_especialidad: string | null;
  id_resultado: number | null;
  resultado: string | null;
  resultado_observaciones: string | null;
  fecha_resultado: string | null;
  validado_por: string | null;
}

export interface LabResultRecord {
  id_resultado: number;
  id_orden: number;
  resultado: string;
  observaciones: string | null;
  fecha_resultado: string;
  validado_por: string | null;
  created_at: string;
  updated_at: string;
  id_paciente: number;
  id_cita: number | null;
  id_visita: number | null;
  examen: string;
  prioridad: LaboratoryPriority;
  estado: LaboratoryOrderStatus;
  costo: number;
  paciente_nombre: string | null;
  paciente_dni: string | null;
  medico_nombre: string | null;
}

export interface LabSupplyRecord {
  id_insumo: number;
  nombre: string;
  categoria: string;
  unidad: string;
  stock: number;
  stock_minimo: number;
  fecha_vencimiento: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabSupplyAlert {
  key: string;
  itemId: string;
  type: "stock" | "expiration";
  level: "low" | "expired" | "expiring";
  name: string;
  badge: string;
  detail: string;
  recommendation: string;
}

export interface LabSupplyAlertsResponse {
  source: string;
  generatedAt: string;
  summary: {
    totalItems: number;
    totalAlerts: number;
    lowStock: number;
    outOfStock: number;
    expired: number;
    expiringSoon: number;
  };
  alerts: LabSupplyAlert[];
}

export interface LabOrderPayload {
  id_paciente?: number | null;
  id_cita?: number | null;
  id_visita?: number | null;
  examen: string;
  prioridad?: LaboratoryPriority;
  estado?: LaboratoryOrderStatus;
  costo?: number;
}

export interface LabResultPayload {
  id_orden: number;
  resultado: string;
  observaciones?: string | null;
  fecha_resultado?: string | null;
  validado_por?: string | null;
}

export interface LabSupplyPayload {
  nombre: string;
  categoria?: string;
  unidad?: string;
  stock?: number;
  stock_minimo?: number;
  fecha_vencimiento?: string | null;
}

export interface LabSupplyMovementPayload {
  tipo: "entrada" | "salida";
  cantidad: number;
  motivo?: string | null;
}

export interface LabSupplyMovementResponse {
  insumo: LabSupplyRecord;
  movimiento: {
    id_movimiento: number;
    id_insumo: number;
    tipo: "entrada" | "salida";
    cantidad: number;
    motivo: string | null;
    id_usuario: number | null;
    created_at: string;
  };
}

export interface FetchLabOrdersParams {
  q?: string;
  id_paciente?: number | string;
  id_cita?: number | string;
  id_visita?: number | string;
  estado?: LaboratoryOrderStatus | string;
  prioridad?: LaboratoryPriority | string;
}

export interface FetchLabResultsParams {
  id_paciente?: number | string;
  id_visita?: number | string;
  id_orden?: number | string;
}

export interface FetchLabSuppliesParams {
  q?: string;
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

export async function fetchLabOrders(params?: FetchLabOrdersParams, signal?: AbortSignal) {
  const response = await request<LabOrderRecord[] | PaginatedResponse<LabOrderRecord>>(
    `/api/laboratorio/ordenes${buildQuery(params)}`,
    { method: "GET", signal },
    "No se pudieron obtener las ordenes de laboratorio."
  );

  return unwrapList(response);
}

export function createLabOrder(payload: LabOrderPayload) {
  return request<LabOrderRecord>(
    "/api/laboratorio/ordenes",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "No se pudo crear la orden de laboratorio."
  );
}

export function updateLabOrder(id: number, payload: LabOrderPayload) {
  return request<LabOrderRecord>(
    `/api/laboratorio/ordenes/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar la orden de laboratorio."
  );
}

export function updateLabOrderStatus(id: number, estado: LaboratoryOrderStatus) {
  return request<LabOrderRecord>(
    `/api/laboratorio/ordenes/${id}/estado`,
    {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    },
    "No se pudo actualizar el estado de la orden."
  );
}

export async function fetchLabSupplies(params?: FetchLabSuppliesParams, signal?: AbortSignal) {
  const response = await request<LabSupplyRecord[] | PaginatedResponse<LabSupplyRecord>>(
    `/api/laboratorio/insumos${buildQuery(params)}`,
    { method: "GET", signal },
    "No se pudieron obtener los insumos de laboratorio."
  );

  return unwrapList(response);
}

export function fetchLabSupplyAlerts(signal?: AbortSignal) {
  return request<LabSupplyAlertsResponse>(
    "/api/laboratorio/insumos/alertas",
    { method: "GET", signal },
    "No se pudieron obtener las alertas de insumos."
  );
}

export function createLabSupply(payload: LabSupplyPayload) {
  return request<LabSupplyRecord>(
    "/api/laboratorio/insumos",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "No se pudo crear el insumo de laboratorio."
  );
}

export function updateLabSupply(id: number, payload: LabSupplyPayload) {
  return request<LabSupplyRecord>(
    `/api/laboratorio/insumos/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar el insumo de laboratorio."
  );
}

export function registerLabSupplyMovement(id: number, payload: LabSupplyMovementPayload) {
  return request<LabSupplyMovementResponse>(
    `/api/laboratorio/insumos/${id}/movimientos`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "No se pudo registrar el movimiento del insumo."
  );
}

export async function fetchLabResults(params?: FetchLabResultsParams, signal?: AbortSignal) {
  const response = await request<LabResultRecord[] | PaginatedResponse<LabResultRecord>>(
    `/api/laboratorio/resultados${buildQuery(params)}`,
    { method: "GET", signal },
    "No se pudieron obtener los resultados de laboratorio."
  );

  return unwrapList(response);
}

export function saveLabResult(payload: LabResultPayload) {
  return request<LabResultRecord>(
    "/api/laboratorio/resultados",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "No se pudo guardar el resultado del laboratorio."
  );
}
