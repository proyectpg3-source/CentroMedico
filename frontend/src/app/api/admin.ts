import { request, unwrapList, type PaginatedResponse } from "./client";

export interface BackupExportResponse {
  schemaVersion: number;
  exportedAt: string;
  generatedBy: {
    id_usuario: number;
    nombre: string;
    email: string;
  };
  counts: Record<string, number>;
  data: Record<string, unknown[]>;
}

export interface AuditEventRecord {
  id_evento: number;
  id_usuario: number | null;
  usuario_nombre: string | null;
  usuario_email: string | null;
  accion: string;
  entidad: string;
  id_entidad: string | null;
  descripcion: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function exportBackup() {
  return request<BackupExportResponse>(
    "/api/backups/export",
    { method: "GET" },
    "No se pudo generar el respaldo."
  );
}

export async function fetchAuditEvents(signal?: AbortSignal) {
  const response = await request<AuditEventRecord[] | PaginatedResponse<AuditEventRecord>>(
    "/api/auditoria?limit=20",
    { method: "GET", signal },
    "No se pudieron cargar los eventos de auditoria."
  );

  return unwrapList(response);
}
