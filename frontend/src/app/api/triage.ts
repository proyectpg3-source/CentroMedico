import { request, unwrapList, type PaginatedResponse } from "./client";
import type { ClinicalPriority, PriorityEvidence } from "./analysis";

// ---------------------------------------------------------------------------
// Tipos del flujo: Evaluación de Enfermería (SATS) → Motor P1–P4 →
// Validación profesional → Cola médica.
// ---------------------------------------------------------------------------

export type PriorityLevel = "P1" | "P2" | "P3" | "P4";
export type ReviewState = "PRESENTE" | "AUSENTE" | "NO_EVALUADO";
export type ProposalState = "PROPUESTA_CONCLUSIVA" | "PROPUESTA_PROVISIONAL" | "SIN_PROPUESTA";
export type Mobility = "CAMINA" | "CON_AYUDA" | "CAMILLA_INMOVIL";
export type Consciousness = "ALERTA" | "CONFUSO" | "VOZ" | "DOLOR" | "NO_RESPONDE";
export type UnavailableField = "frecuencia_respiratoria" | "frecuencia_cardiaca" | "presion_sistolica" | "temperatura";

export interface SatsDiscriminator {
  code: string;
  level: PriorityLevel;
  description: string;
}

export interface SatsCatalog {
  version_catalogo: string;
  catalogo_completo_validado: boolean;
  estados_revision: ReviewState[];
  discriminadores: SatsDiscriminator[];
  campos_no_obtenibles_permitidos: UnavailableField[];
  motivos_no_obtenible: Array<{ code: string; description: string }>;
}

export interface MetRule {
  codigo: string;
  nivel: PriorityLevel;
  descripcion: string;
  referencia: string;
  evidencia: string;
}

export interface ProposalAlert {
  codigo: string;
  tipo: "INCONSISTENCIA" | "INFORMATIVA";
  descripcion: string;
  evidencia: string;
  referencia: string;
}

export interface PriorityProposal {
  version_reglas: string;
  estado: ProposalState;
  politica_aplicada: string;
  nivel_propuesto: PriorityLevel | null;
  nivel_maximo_posible: PriorityLevel | null;
  detalle_nivel: { nombre: string; color: string; objetivo_minutos: number; objetivo: string } | null;
  puntaje_tews_confirmado: number | null;
  intervalo_tews: { minimo: number; maximo: number } | null;
  reglas_cumplidas: MetRule[];
  alertas: ProposalAlert[];
  acciones_requeridas: string[];
  requiere_confirmacion_humana: boolean;
  requiere_justificacion_confirmacion: boolean;
  motivos_justificacion: string[];
  fundamento: string;
}

export interface TewsComponent {
  campo: string;
  estado: "MEDIDO" | "NO_OBTENIBLE" | "FALTANTE" | "INVALIDO";
  puntaje: number | null;
  puntaje_maximo_posible: number;
  motivo?: string;
}

export interface SatsClassification {
  estado: string;
  categoria_confirmada: PriorityLevel | null;
  categoria_maxima_posible: PriorityLevel | null;
  conclusiva: boolean;
  registro_completo: boolean;
  motivos_provisional?: string[];
  mensaje: string;
  tews?: {
    estado: string;
    aplicable: boolean;
    puntaje: number | null;
    puntaje_minimo: number | null;
    puntaje_maximo: number | null;
    componentes: TewsComponent[];
    campos_no_obtenibles: string[];
    campos_faltantes: string[];
    motivo?: string;
  };
  discriminadores?: {
    total_catalogo: number;
    total_revisados: number;
    revision_completa: boolean;
    presentes: string[];
    no_evaluados: string[];
    no_evaluados_relevantes: string[];
  };
}

export interface TriageRecord {
  evidencia_priorizacion?: PriorityEvidence;
  id_triaje: number;
  id_cita: number;
  id_paciente: number;
  fecha_triaje: string;
  created_at: string;
  motivo_consulta: string;
  historia_enfermedad_actual: string | null;
  antecedentes_relevantes: string | null;
  alergias_referidas: string | null;
  presion_arterial: string | null;
  frecuencia_cardiaca: number | null;
  frecuencia_respiratoria: number | null;
  temperatura: number | string | null;
  saturacion_oxigeno: number | null;
  peso: number | string | null;
  glucometria: number | string | null;
  observaciones: string | null;
  // Registro SATS
  movilidad: Mobility | null;
  estado_conciencia: Consciousness | null;
  trauma: "SI" | "NO" | null;
  edad_evaluacion: number | null;
  revision_discriminadores: Record<string, ReviewState> | null;
  datos_no_obtenibles: Partial<Record<UnavailableField, string>>;
  revision_completa: boolean;
  clasificacion_sats: SatsClassification | null;
  // Motor P1–P4
  propuesta: PriorityProposal | null;
  estado_propuesta: ProposalState | null;
  nivel_propuesto: PriorityLevel | null;
  nivel_maximo_posible: PriorityLevel | null;
  version_reglas: string | null;
  requiere_justificacion: boolean;
  // Validación profesional
  estado_prioridad: "propuesto" | "validado";
  prioridad_final: PriorityLevel | null;
  origen_clasificacion: "AUTOMATICA" | "MANUAL" | null;
  motivo_confirmacion: string | null;
  fecha_validacion: string | null;
  usuario_registro_nombre: string | null;
  usuario_validacion_nombre: string | null;
  // Columnas heredadas
  prioridad_clinica: ClinicalPriority;
  puntaje_prioridad: number;
  motivos_prioridad: string | null;
  // Cita y paciente
  fecha_hora: string;
  cita_estado: string;
  hora_llegada: string | null;
  hora_inicio_atencion: string | null;
  id_medico: number | null;
  paciente_nombre: string | null;
  paciente_dni: string | null;
  paciente_telefono: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  residencia: string | null;
  medico_nombre: string | null;
  medico_especialidad: string | null;
}

export interface TriagePayload {
  id_cita: number;
  motivo_consulta: string;
  historia_enfermedad_actual?: string | null;
  antecedentes_relevantes?: string | null;
  alergias_referidas?: string | null;
  presion_arterial?: string | null;
  frecuencia_cardiaca?: number | null;
  frecuencia_respiratoria?: number | null;
  temperatura?: number | null;
  saturacion_oxigeno?: number | null;
  peso?: number | null;
  glucometria?: number | null;
  observaciones?: string | null;
  movilidad?: Mobility | null;
  estado_conciencia?: Consciousness | null;
  trauma?: "SI" | "NO" | null;
  revision_discriminadores?: Record<string, ReviewState>;
  datos_no_obtenibles?: Partial<Record<UnavailableField, string>>;
}

export interface TriagePreview {
  edad: number | null;
  clasificacion_sats: SatsClassification;
  propuesta: PriorityProposal;
  revision: { total_catalogo: number; total_revisados: number; revision_completa: boolean };
  guardado: false;
}

export interface QueueEntry {
  id_triaje: number;
  id_cita: number;
  id_paciente: number;
  prioridad_final: PriorityLevel;
  origen_clasificacion: "AUTOMATICA" | "MANUAL";
  nivel_propuesto: PriorityLevel | null;
  ingreso_cola: string;
  llamado_at: string | null;
  llamados: number;
  motivo_consulta: string;
  cita_estado: string;
  hora_llegada: string | null;
  hora_inicio_atencion: string | null;
  paciente_nombre: string | null;
  paciente_dni: string | null;
  medico_nombre: string | null;
  estado_cola: "EN_ESPERA" | "LLAMADO" | "EN_ATENCION";
  minutos_en_cola: number;
  minutos_desde_llegada: number;
  posicion: number | null;
  objetivo_minutos: number | null;
  objetivo: string | null;
  fuera_de_objetivo: boolean;
}

export interface ValidationCaseResult {
  id: string;
  titulo: string;
  esperado: { estado: string; nivel: PriorityLevel | null };
  obtenido: { estado: string; nivel: PriorityLevel | null; nivel_maximo_posible: PriorityLevel | null; reglas: string[]; alertas: string[] };
  correcto: boolean;
}

export interface RulesOverview {
  version_reglas: string;
  base: string;
  niveles: Record<PriorityLevel, { nombre: string; color: string; objetivo_minutos: number; objetivo: string }>;
  reglas: Array<{ codigo: string; nivel: PriorityLevel; tipo: string; descripcion: string; referencia: string }>;
  politica_propuesta: Array<{ codigo: string; descripcion: string }>;
  alertas: Array<{ codigo: string; tipo: string; descripcion: string; referencia: string }>;
  validacion: { version_reglas: string; total: number; correctos: number; todos_correctos: boolean; casos: ValidationCaseResult[] };
  aprobacion: { estado: "APROBADA" | "OBSERVADA" | "PENDIENTE_APROBACION_MEDICA"; ultima: RulesApproval | null };
  historial_aprobaciones: RulesApproval[];
}

export interface RulesApproval {
  id_aprobacion: number;
  version_reglas: string;
  decision: "APROBADA" | "OBSERVADA";
  observaciones: string | null;
  casos_validados: number;
  casos_correctos: number;
  registrado_en: string;
  usuario: string | null;
}

export interface TriageHistoryEntry {
  id_historial: number;
  accion: "REGISTRO" | "ACTUALIZACION" | "VALIDACION" | "LLAMADO" | "INICIO_ATENCION";
  datos: Record<string, unknown>;
  registrado_en: string;
  usuario: string | null;
}

// ---------------------------------------------------------------------------

export async function fetchTriages(signal?: AbortSignal, params: { estado_prioridad?: "propuesto" | "validado"; abiertas?: boolean } = {}) {
  const search = new URLSearchParams({ limit: "100" });
  if (params.estado_prioridad) search.set("estado_prioridad", params.estado_prioridad);
  if (params.abiertas) search.set("abiertas", "1");
  const response = await request<TriageRecord[] | PaginatedResponse<TriageRecord>>(
    `/api/triajes?${search.toString()}`,
    { method: "GET", signal },
    "No se pudieron cargar los triajes."
  );
  return unwrapList(response);
}

export function fetchSatsCatalog(signal?: AbortSignal) {
  return request<SatsCatalog>("/api/triajes/catalogo", { method: "GET", signal }, "No se pudo cargar el catálogo SATS.");
}

export function saveTriage(payload: TriagePayload) {
  return request<TriageRecord>(
    "/api/triajes",
    { method: "POST", body: JSON.stringify(payload) },
    "No se pudo guardar la evaluación de Enfermería."
  );
}

export function previewTriage(payload: TriagePayload) {
  return request<TriagePreview>(
    "/api/triajes/vista-previa",
    { method: "POST", body: JSON.stringify(payload) },
    "No se pudo calcular la propuesta."
  );
}

export function validateTriage({ id_cita, prioridad_final, justificacion }: { id_cita: number; prioridad_final: PriorityLevel; justificacion: string | null }) {
  return request<TriageRecord>(
    "/api/triajes/validar",
    { method: "PATCH", body: JSON.stringify({ id_cita, prioridad_final, justificacion }) },
    "Error al validar la prioridad."
  );
}

export function fetchTriageHistory(idCita: number, signal?: AbortSignal) {
  return request<TriageHistoryEntry[]>(`/api/triajes/cita/${idCita}/historial`, { method: "GET", signal }, "No se pudo cargar la bitácora.");
}

export function fetchMedicalQueue(signal?: AbortSignal) {
  return request<QueueEntry[]>("/api/triajes/cola", { method: "GET", signal }, "No se pudo cargar la cola médica.");
}

export function callQueuePatient(idCita: number) {
  return request<QueueEntry>(`/api/triajes/cola/${idCita}/llamar`, { method: "POST" }, "No se pudo llamar al paciente.");
}

export function startQueueAttention(idCita: number) {
  return request<{ id_cita: number; estado: string }>(`/api/triajes/cola/${idCita}/iniciar`, { method: "POST" }, "No se pudo iniciar la atención.");
}

export function fetchPriorityRules(signal?: AbortSignal) {
  return request<RulesOverview>("/api/triajes/reglas", { method: "GET", signal }, "No se pudieron cargar las reglas P1–P4.");
}

export function approvePriorityRules(payload: { decision: "APROBADA" | "OBSERVADA"; observaciones?: string }) {
  return request<RulesApproval>(
    "/api/triajes/reglas/aprobacion",
    { method: "POST", body: JSON.stringify(payload) },
    "No se pudo registrar la decisión."
  );
}
