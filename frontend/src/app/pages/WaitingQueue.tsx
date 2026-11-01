import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, ArrowRight, Bell, Clock, Loader2, Search, Stethoscope, User } from "lucide-react";
import { Header } from "../components/layout/Header";
import { usePermissions } from "../auth/usePermissions";
import { callQueuePatient, fetchMedicalQueue, startQueueAttention, type QueueEntry } from "../api/triage";
import { LEVEL_META } from "../components/PriorityProposal";
import { formatDateTime, getErrorMessage } from "../lib/format";

const STATE_LABEL: Record<QueueEntry["estado_cola"], { text: string; tone: string }> = {
  EN_ESPERA: { text: "En espera", tone: "bg-slate-100 text-slate-700" },
  LLAMADO: { text: "Llamado", tone: "bg-blue-100 text-blue-800" },
  EN_ATENCION: { text: "En atención", tone: "bg-emerald-100 text-emerald-800" },
};

export default function WaitingQueue() {
  const navigate = useNavigate();
  const { role } = usePermissions();
  const canAttend = role === "admin" || role === "medico";
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData(signal?: AbortSignal) {
    try {
      setError(null);
      setQueue(await fetchMedicalQueue(signal));
    } catch (reason) {
      if (!signal?.aborted) setError(getErrorMessage(reason, "No se pudo cargar la cola médica."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    const interval = setInterval(() => void loadData(), 30000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  async function call(entry: QueueEntry) {
    setBusy(entry.id_cita);
    try {
      await callQueuePatient(entry.id_cita);
      await loadData();
    } catch (reason) {
      setError(getErrorMessage(reason, "No se pudo llamar al paciente."));
    } finally {
      setBusy(null);
    }
  }

  async function start(entry: QueueEntry) {
    setBusy(entry.id_cita);
    try {
      if (entry.estado_cola !== "EN_ATENCION") await startQueueAttention(entry.id_cita);
      navigate(`/consulta/${entry.id_cita}`);
    } catch (reason) {
      setError(getErrorMessage(reason, "No se pudo iniciar la atención."));
      setBusy(null);
    }
  }

  const term = search.trim().toLowerCase();
  const filtered = queue.filter((p) => !term || `${p.paciente_nombre || ""} ${p.paciente_dni || ""}`.toLowerCase().includes(term));
  const waiting = queue.filter((p) => p.estado_cola !== "EN_ATENCION");
  const overdue = waiting.filter((p) => p.fuera_de_objetivo).length;

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Cola médica" subtitle="Pacientes con prioridad validada, en orden de atención" />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(["P1", "P2", "P3", "P4"] as const).map((level) => (
            <div key={level} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{level} · {LEVEL_META[level].name}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{loading ? "…" : waiting.filter((p) => p.prioridad_final === level).length}</p>
              <p className="text-[11px] text-slate-400">Objetivo {LEVEL_META[level].target}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar paciente en cola..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm outline-none focus:border-blue-500" />
          </div>
          <p className="text-sm text-slate-500">Orden: prioridad validada → hora de ingreso a la cola{overdue > 0 ? ` · ${overdue} fuera del tiempo objetivo` : ""}</p>
        </div>

        {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">{error}</div>}

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center">
            <User className="mb-3 h-12 w-12 text-slate-300" />
            <p className="font-medium text-slate-500">No hay pacientes en la cola médica</p>
            <p className="text-xs text-slate-400">Los pacientes aparecen aquí cuando un médico valida su prioridad</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {filtered.map((patient) => {
              const meta = LEVEL_META[patient.prioridad_final];
              const state = STATE_LABEL[patient.estado_cola];
              return (
                <li key={patient.id_cita} className={`flex flex-col items-start justify-between gap-4 rounded-2xl border p-4 md:flex-row md:items-center ${patient.fuera_de_objetivo ? "border-rose-200 bg-rose-50/40" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-sm font-bold ${meta.solid}`}>
                      {patient.prioridad_final}
                      {patient.posicion && <span className="text-[10px] font-normal opacity-90">#{patient.posicion}</span>}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{patient.paciente_nombre}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${state.tone}`}>{state.text}</span>
                        {patient.origen_clasificacion === "MANUAL" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Clasificación manual</span>}
                        {patient.fuera_de_objetivo && <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700"><AlertTriangle className="h-3 w-3" />Fuera de objetivo</span>}
                      </div>
                      <p className="text-xs text-slate-500">DPI {patient.paciente_dni || "—"} · {patient.motivo_consulta} · {patient.medico_nombre || "sin médico asignado"}</p>
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-end">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <Clock className={`h-4 w-4 ${patient.fuera_de_objetivo ? "text-rose-600" : "text-slate-400"}`} />
                        <span>{patient.minutos_en_cola} min en cola</span>
                      </div>
                      <p className="text-[11px] text-slate-400">Ingreso {formatDateTime(patient.ingreso_cola)} · objetivo {patient.objetivo}</p>
                    </div>
                    {canAttend && (
                      <div className="flex gap-2">
                        {patient.estado_cola !== "EN_ATENCION" && (
                          <button type="button" disabled={busy === patient.id_cita} onClick={() => call(patient)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                            <Bell className="h-4 w-4" />{patient.llamados > 0 ? `Llamar de nuevo (${patient.llamados})` : "Llamar"}
                          </button>
                        )}
                        <button type="button" disabled={busy === patient.id_cita} onClick={() => start(patient)} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
                          {patient.estado_cola === "EN_ATENCION" ? <Stethoscope className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                          {patient.estado_cola === "EN_ATENCION" ? "Continuar consulta" : "Iniciar atención"}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
