import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Search,
  Loader2,
  Filter
} from "lucide-react";
import { Header } from "../components/layout/Header";
import { fetchAppointments, type AppointmentRecord } from "../api/appointments";
import { fetchTriages, type TriageRecord } from "../api/triage";
import { formatDateTime } from "../lib/format";

const priorityOrder: Record<string, number> = {
  critica: 1,
  alta: 2,
  media: 3,
  baja: 4,
};

const priorityMeta: Record<string, { label: string; color: string; maxWait: number }> = {
  critica: { label: "P1 - Crítica", color: "bg-rose-600 text-white", maxWait: 0 }, // Inmediato
  alta: { label: "P2 - Alta", color: "bg-orange-500 text-white", maxWait: 15 }, // 15 min
  media: { label: "P3 - Media", color: "bg-amber-400 text-amber-900", maxWait: 60 }, // 1 hora
  baja: { label: "P4 - Baja", color: "bg-slate-400 text-white", maxWait: 180 }, // 3 horas
};

export default function WaitingQueue() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [triages, setTriages] = useState<TriageRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const [appData, triageData] = await Promise.all([
        fetchAppointments(),
        fetchTriages(),
      ]);
      setAppointments(appData);
      setTriages(triageData);
    } catch (error) {
      console.error("Error loading queue:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Actualizar cada 30 seg
    return () => clearInterval(interval);
  }, []);

  const queue = useMemo(() => {
    // Solo pacientes con triaje validado y que no han sido atendidos aún
    return appointments
      .filter(app => {
        const triage = triages.find(t => t.id_cita === app.id_cita);
        return triage && triage.estado_prioridad === "validado" && app.estado !== "completada";
      })
      .map(app => {
        const triage = triages.find(t => t.id_cita === app.id_cita)!;
        return { ...app, triage };
      })
      .sort((a, b) => {
        const pA = priorityOrder[a.prioridad_clinica || "baja"];
        const pB = priorityOrder[b.prioridad_clinica || "baja"];
        if (pA !== pB) return pA - pB;
        return new Date(a.triage.fecha_triaje).getTime() - new Date(b.triage.fecha_triaje).getTime();
      });
  }, [appointments, triages]);

  const filteredQueue = queue.filter(p =>
    p.paciente_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.paciente_dni?.toLowerCase().includes(search.toLowerCase())
  );

  function calculateWaitTime(fechaTriaje: string) {
    const start = new Date(fechaTriaje).getTime();
    const now = new Date().getTime();
    return Math.floor((now - start) / 60000); // minutos
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Cola de Espera Médica"
        subtitle="Pacientes triados y validados listos para atención"
      />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        {/* Barra de herramientas */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar paciente en cola..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Filter className="h-4 w-4" />
            <span>Orden: Prioridad $\rightarrow$ Hora de llegada</span>
          </div>
        </div>

        {loading && appointments.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center">
            <User className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No hay pacientes en cola actualmente</p>
            <p className="text-xs text-slate-400">Los pacientes aparecerán aquí tras la validación del triaje</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredQueue.map((patient) => {
              const waitTime = calculateWaitTime(patient.triage.fecha_triaje);
              const meta = priorityMeta[patient.prioridad_clinica || "baja"];
              const isOverdue = waitTime > meta.maxWait && meta.maxWait > 0;

              return (
                <div
                  key={patient.id_cita}
                  className={`group relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border p-4 transition-all hover:shadow-md ${
                    isOverdue ? "border-rose-200 bg-rose-50/30" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Badge de Prioridad */}
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${meta.color}`}>
                      {meta.label.split(" ")[0]}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{patient.paciente_nombre}</h3>
                        {isOverdue && (
                          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
                            <AlertTriangle className="h-3 w-3" />
                            Retrasado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        DNI: {patient.paciente_dni} · Motivo: {patient.triage.motivo_consulta}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <Clock className={`h-4 w-4 ${isOverdue ? "text-rose-600" : "text-slate-400"}`} />
                        <span>{waitTime} min espera</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Llegada: {formatDateTime(patient.triage.fecha_triaje)}</p>
                    </div>

                    <button
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                      onClick={() => alert(`Llamando a ${patient.paciente_nombre}...`)}
                    >
                      Llamar
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
