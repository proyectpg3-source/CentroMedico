import { request } from "./client";

export type Level = "P1" | "P2" | "P3" | "P4";

export interface Describe {
  n: number;
  media: number | null;
  mediana: number | null;
  p25: number | null;
  p75: number | null;
  p90: number | null;
  minimo: number | null;
  maximo: number | null;
  sin_dato?: number;
  inconsistentes?: number;
}

export interface PeriodIndicators {
  fuente: "SISTEMA" | "LINEA_BASE";
  volumen: { registros: number; dias_con_registros: number; promedio_diario: number | null };
  tiempos: Record<string, Describe>;
  distribucion_prioridades: Record<Level, { n: number; porcentaje: number | null }> & { sin_prioridad: number };
  por_prioridad: Record<Level, { espera_hasta_consulta: Describe; objetivo_minutos: number; dentro_objetivo: number; cumplimiento_porcentaje: number | null }>;
  cumplimiento_objetivo_global: { medidos: number; dentro_objetivo: number; porcentaje: number | null };
  concordancia_motor?: {
    priorizaciones: number;
    automaticas_confirmadas: number;
    manuales: number;
    porcentaje_automaticas: number | null;
    confirmadas_sin_cambio: number;
    elevadas_por_personal: number;
    disminuidas_por_personal: number;
    concordancia_porcentaje: number | null;
  };
  calidad_registro?: { valoraciones_sats: number; revision_discriminadores_completa: number; porcentaje: number | null };
}

export interface ComparisonRow {
  codigo: string;
  nombre: string;
  mediana_antes: number | null;
  mediana_despues: number | null;
  diferencia_minutos: number | null;
  cambio_porcentaje: number | null;
  prueba: { aplicable: boolean; motivo?: string; n_antes: number; n_despues: number; p_valor?: number; significativo?: boolean; u?: number; z?: number };
  conclusion: "SIN_DATOS_SUFICIENTES" | "SIN_DIFERENCIA_SIGNIFICATIVA" | "MEJORA_SIGNIFICATIVA" | "EMPEORA_SIGNIFICATIVO";
}

export interface IndicatorsReport {
  version_indicadores: string;
  generado_en: string;
  definiciones: Array<{ codigo: string; nombre: string; descripcion: string; en_linea_base: boolean }>;
  objetivos_minutos: Record<Level, number>;
  periodo_antes: { desde: string | null; hasta: string | null; fuente: string; registros_disponibles: number };
  periodo_despues: { desde: string; hasta: string; fuente: string };
  resultados_truncados: boolean;
  antes: PeriodIndicators;
  despues: PeriodIndicators;
  comparacion: { tiempos: ComparisonRow[]; cumplimiento_objetivo: { antes: number | null; despues: number | null; diferencia_puntos: number | null } };
}

export interface BaselineBatch {
  id_lote: number;
  nombre: string;
  descripcion: string | null;
  origen: "IMPORTACION" | "CAPTURA";
  total_registros: number;
  registrado_en: string;
  anulado: boolean;
  motivo_anulacion: string | null;
  usuario: string | null;
  desde: string | null;
  hasta: string | null;
}

export interface BatchResult {
  simulado: boolean;
  nombre: string;
  filas_validas: number;
  desde: string;
  hasta: string;
  con_prioridad: number;
  con_consulta: number;
}

export function fetchIndicators(params: { desde?: string; hasta?: string; base_desde?: string; base_hasta?: string }, signal?: AbortSignal) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  return request<IndicatorsReport>(`/api/indicadores?${search.toString()}`, { method: "GET", signal }, "No se pudieron calcular los indicadores.");
}

export function fetchBaselineBatches(signal?: AbortSignal) {
  return request<BaselineBatch[]>("/api/indicadores/linea-base/lotes", { method: "GET", signal }, "No se pudieron cargar los lotes.");
}

export function fetchBaselineTemplate() {
  return request<{ csv: string; columnas: Array<{ campo: string; requerido: boolean; descripcion: string }> }>(
    "/api/indicadores/linea-base/plantilla",
    { method: "GET" },
    "No se pudo obtener la plantilla."
  );
}

export function uploadBaseline(payload: { nombre: string; descripcion?: string; csv: string; simular: boolean }) {
  return request<BatchResult>(
    "/api/indicadores/linea-base/lotes",
    { method: "POST", body: JSON.stringify(payload) },
    "No se pudo registrar la línea base."
  );
}

export function voidBaseline(idLote: number, motivo: string) {
  return request<unknown>(
    `/api/indicadores/linea-base/lotes/${idLote}/anular`,
    { method: "POST", body: JSON.stringify({ motivo }) },
    "No se pudo anular el lote."
  );
}
