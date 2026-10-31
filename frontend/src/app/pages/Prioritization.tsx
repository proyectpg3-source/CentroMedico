import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Loader2,
  PlayCircle,
  RefreshCcw,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Header } from "../components/layout/Header";
import { PriorityEvidence } from "../components/PriorityEvidence";
import { Can } from "../auth/usePermissions";
import {
  fetchAnalysisIndicators,
  fetchPriorityQueue,
  recalculatePriorityQueue,
  simulatePriority,
  type AnalysisIndicators,
  type ClinicalPriority,
  type PriorityQueueRecord,
  type PrioritySimulationResult,
} from "../api/analysis";
import { fetchPatients, type PatientRecord } from "../api/patients";
import { updateAppointmentStatus, type AppointmentStatus } from "../api/appointments";
import { formatDate, formatDateTime, formatDuration, getErrorMessage } from "../lib/format";

const priorityMeta: Record<
  ClinicalPriority,
  { label: string; badge: string; panel: string; icon: typeof ShieldAlert }
> = {
  baja: {
    label: "Baja",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    panel: "border-l-slate-400",
    icon: Activity,
  },
  media: {
    label: "Media",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    panel: "border-l-amber-500",
    icon: Clock3,
  },
  alta: {
    label: "Alta",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    panel: "border-l-orange-500",
    icon: ShieldAlert,
  },
  critica: {
    label: "Critica",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    panel: "border-l-rose-500",
    icon: ShieldAlert,
  },
};

const statusOptions: AppointmentStatus[] = [
  "pendiente",
  "confirmada",
  "en_curso",
  "completada",
  "cancelada",
];

function normalizePriority(value: string | null | undefined): ClinicalPriority {
  if (value === "critica" || value === "alta" || value === "media" || value === "baja") {
    return value;
  }
  return "baja";
}

function splitReasons(value: string | null | undefined) {
  return String(value || "")
    .split(".")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export default function Prioritization() {
  const [queue, setQueue] = useState<PriorityQueueRecord[]>([]);
  const [indicators, setIndicators] = useState<AnalysisIndicators | null>(null);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [simulation, setSimulation] = useState({
    id_paciente: "",
    motivo: "Fiebre alta y dolor abdominal",
    triaje_notas: "",
  });
  const [simulationResult, setSimulationResult] = useState<PrioritySimulationResult | null>(null);

  async function loadData(signal?: AbortSignal) {
    setLoading(true);
    setWarning(null);

    try {
      const [queueResult, indicatorsResult, patientsResult] = await Promise.all([
        fetchPriorityQueue(signal),
        fetchAnalysisIndicators(signal),
        fetchPatients(signal),
      ]);

      setQueue(queueResult);
      setIndicators(indicatorsResult);
      setPatients(patientsResult);
    } catch (error) {
      if (!signal?.aborted) {
        setWarning(getErrorMessage(error, "No se pudo cargar la priorizacion clinica."));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, []);

  const filteredQueue = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return queue;

    return queue.filter((item) =>
      [
        item.paciente_nombre,
        item.paciente_dni,
        item.medico_nombre,
        item.medico_especialidad,
        item.motivo,
        item.triaje_notas,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [queue, search]);

  async function handleRecalculate() {
    setActionLoading(true);
    setWarning(null);

    try {
      const result = await recalculatePriorityQueue();
      setSuccessMessage(`Se recalcularon ${result.total_recalculadas} citas activas.`);
      await loadData();
    } catch (error) {
      setWarning(getErrorMessage(error, "No se pudo recalcular la cola."));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStatusChange(id: number, status: AppointmentStatus) {
    setStatusUpdatingId(id);
    setWarning(null);

    try {
      await updateAppointmentStatus(id, status);
      await loadData();
    } catch (error) {
      setWarning(getErrorMessage(error, "No se pudo actualizar el estado de la cita."));
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleSimulationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading(true);
    setWarning(null);
    setSimulationResult(null);

    try {
      const result = await simulatePriority({
        id_paciente: simulation.id_paciente ? Number(simulation.id_paciente) : null,
        motivo: simulation.motivo,
        triaje_notas: simulation.triaje_notas,
      });
      setSimulationResult(result);
    } catch (error) {
      setWarning(getErrorMessage(error, "No se pudo simular la prioridad."));
    } finally {
      setActionLoading(false);
    }
  }

  const stats = [
    {
      label: "Citas activas",
      value: indicators?.citas_activas ?? queue.length,
      icon: Activity,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Alta prioridad",
      value: indicators?.citas_alta_prioridad ?? 0,
      icon: ShieldAlert,
      tone: "bg-rose-50 text-rose-600",
    },
    {
      label: "Espera promedio",
      value: formatDuration(indicators?.espera_promedio_minutos),
      icon: Clock3,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Pacientes evaluados",
      value: new Set(queue.map((item) => item.id_paciente)).size,
      icon: UserRound,
      tone: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Priorizacion de pacientes"
        subtitle="Analisis historico inicial para apoyar el orden de atencion y reducir tiempos de espera"
      />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        {warning && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">{warning}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <p className="text-sm text-emerald-800">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {loading ? "..." : item.value}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
          <section className="space-y-4">
            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Cola priorizada</h2>
                  <p className="text-sm text-slate-500">
                    Orden sugerido segun sintomas, historial y espera registrada
                  </p>
                </div>
                <Can module="prioritization" action="edit">
                  <button
                    type="button"
                    onClick={() => void handleRecalculate()}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    Recalcular
                  </button>
                </Can>
              </div>

              <div className="relative mt-5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por paciente, doctor, motivo o triaje"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white text-slate-500 shadow-sm">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm">Analizando cola de pacientes...</p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <BrainCircuit className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm font-medium text-slate-700">
                  No hay citas activas para priorizar.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Registra una cita pendiente o confirma una cita para verla en esta cola.
                </p>
              </div>
            ) : (
              filteredQueue.map((appointment) => {
                const priority = normalizePriority(appointment.prioridad_clinica);
                const meta = priorityMeta[priority];
                const reasons = splitReasons(appointment.motivos_prioridad);

                return (
                  <article
                    key={appointment.id_cita}
                    className={`rounded-[28px] border border-slate-200 border-l-4 bg-white p-5 shadow-sm ${meta.panel}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${meta.badge}`}>
                            {meta.label} · {appointment.puntaje_prioridad} pts
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {appointment.estado.replace("_", " ")}
                          </span>
                          {appointment.visitas_previas > 0 && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              {appointment.visitas_previas} visitas previas
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900">
                          {appointment.paciente_nombre || "Paciente sin nombre"}
                        </h3>
                        <PriorityEvidence evidence={appointment.evidencia_priorizacion} />
                        <p className="mt-1 text-sm text-slate-500">
                          {appointment.medico_nombre || "Doctor no asignado"} ·{" "}
                          {appointment.medico_especialidad || "Especialidad no registrada"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:min-w-[360px]">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-400">Cita</p>
                          <p className="mt-1 font-medium text-slate-700">{formatDate(appointment.fecha_hora)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-400">Espera</p>
                          <p className="mt-1 font-medium text-slate-700">{formatDuration(appointment.minutos_espera)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-400">Contacto</p>
                          <p className="mt-1 truncate font-medium text-slate-700">
                            {appointment.paciente_telefono || "Sin telefono"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {appointment.motivo && (
                      <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        {appointment.motivo}
                      </p>
                    )}

                    {reasons.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                        {reasons.map((reason) => (
                          <div key={reason} className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-600">
                            {reason}.
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-400">
                        Ultima visita: {appointment.ultima_visita ? formatDateTime(appointment.ultima_visita) : "sin historial"}
                      </p>
                      <Can module="prioritization" action="edit">
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={appointment.estado as AppointmentStatus}
                            disabled={statusUpdatingId === appointment.id_cita}
                            onChange={(event) =>
                              void handleStatusChange(
                                appointment.id_cita,
                                event.target.value as AppointmentStatus
                              )
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(appointment.id_cita, "en_curso")}
                            disabled={statusUpdatingId === appointment.id_cita || appointment.estado === "en_curso"}
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <PlayCircle className="h-4 w-4" />
                            Atender
                          </button>
                        </div>
                      </Can>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <aside className="space-y-4">
            <form
              onSubmit={(event) => void handleSimulationSubmit(event)}
              className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Simulador</h2>
                  <p className="text-sm text-slate-500">Evalua sintomas antes de crear la cita</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Paciente</label>
                  <select
                    value={simulation.id_paciente}
                    onChange={(event) =>
                      setSimulation((current) => ({ ...current, id_paciente: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Sin historial</option>
                    {patients.map((patient) => (
                      <option key={patient.id_paciente} value={patient.id_paciente}>
                        {patient.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Motivo o sintomas</label>
                  <textarea
                    rows={3}
                    value={simulation.motivo}
                    onChange={(event) =>
                      setSimulation((current) => ({ ...current, motivo: event.target.value }))
                    }
                    className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="Ej. fiebre alta, dolor abdominal, dificultad respiratoria"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Notas de triaje</label>
                  <textarea
                    rows={3}
                    value={simulation.triaje_notas}
                    onChange={(event) =>
                      setSimulation((current) => ({ ...current, triaje_notas: event.target.value }))
                    }
                    className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="Signos vitales, antecedentes o datos observados"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || !simulation.motivo.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
                  Analizar prioridad
                </button>
              </div>

              {simulationResult && (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${priorityMeta[simulationResult.prioridad_clinica].badge}`}>
                    {priorityMeta[simulationResult.prioridad_clinica].label} · {simulationResult.puntaje_prioridad} pts
                  </span>
                  <p className="mt-3 text-sm text-slate-600">{simulationResult.motivos_prioridad}</p>
                  <PriorityEvidence evidence={simulationResult.evidencia_priorizacion} source={simulationResult.fuente_prioridad} />
                </div>
              )}
            </form>

            <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Patrones frecuentes</h2>
              <p className="text-sm text-slate-500">Lectura rapida desde citas y visitas registradas</p>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Motivos de consulta
                  </p>
                  <div className="mt-2 space-y-2">
                    {(indicators?.motivos_frecuentes || []).map((item) => (
                      <div key={item.motivo} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                        <span className="truncate text-sm text-slate-600">{item.motivo}</span>
                        <span className="text-sm font-semibold text-slate-900">{item.total}</span>
                      </div>
                    ))}
                    {indicators?.motivos_frecuentes.length === 0 && (
                      <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        Sin datos suficientes.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Diagnosticos
                  </p>
                  <div className="mt-2 space-y-2">
                    {(indicators?.diagnosticos_frecuentes || []).map((item) => (
                      <div key={item.diagnostico} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                        <span className="truncate text-sm text-slate-600">{item.diagnostico}</span>
                        <span className="text-sm font-semibold text-slate-900">{item.total}</span>
                      </div>
                    ))}
                    {indicators?.diagnosticos_frecuentes.length === 0 && (
                      <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        Sin datos suficientes.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
