// src/app/api/dashboard.ts
import { request } from "./client";

export interface DashboardSummaryRecord {
  total_pacientes: number;
  total_medicos: number;
  total_citas: number;
  citas_por_mes: Array<{ mes: string; citas: number }>;
  citas_por_estado: Array<{ estado: string; total: number }>;
}

export interface HealthStatusRecord {
  status: "ok" | "error";
  database: "connected" | "disconnected";
}

export function fetchDashboardSummary(signal?: AbortSignal) {
  return request<DashboardSummaryRecord>(
    "/api/dashboard/resumen",
    { method: "GET", signal },
    "No se pudo cargar el resumen del dashboard."
  );
}

export function fetchHealthStatus(signal?: AbortSignal) {
  return request<HealthStatusRecord>(
    "/api/health",
    { method: "GET", signal },
    "No se pudo consultar el estado del sistema."
  );
}