import { CheckCircle2, ChevronRight, Clock, Plus, User } from "lucide-react";
import { useState } from "react";
import { Header } from "../components/layout/Header";
import { triagePatients, type TriagePatient } from "../data/mockData";

const priorityConfig = {
  ROJO:     { bg: "bg-red-50",    text: "text-red-700",    badge: "bg-red-500",    border: "border-red-200",   label: "CRÍTICO", ring: "ring-red-500" },
  NARANJA:  { bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-500", border: "border-orange-200", label: "URGENTE", ring: "ring-orange-500" },
  AMARILLO: { bg: "bg-yellow-50", text: "text-yellow-700", badge: "bg-yellow-400", border: "border-yellow-200", label: "MENOS URGENTE", ring: "ring-yellow-400" },
  VERDE:    { bg: "bg-green-50",  text: "text-green-700",  badge: "bg-green-500",  border: "border-green-200",  label: "NO URGENTE", ring: "ring-green-500" },
};

const INITIAL: TriagePatient[] = [
  ...triagePatients,
  { id: "t4", code: "EMG-1122", patientName: "Pedro Ajú López", motive: "Hipertensión severa – cefalea intensa", priority: "NARANJA", ingreso: "10:45", waitMinutes: 8, status: "waiting" },
  { id: "t5", code: "EMG-3344", patientName: "Ana Cumes Bal", motive: "Fiebre 38.9°C – sospecha de malaria", priority: "AMARILLO", ingreso: "11:05", waitMinutes: 22, status: "waiting" },
  { id: "t6", code: "EMG-5566", patientName: "Luis Tzul Coc", motive: "Tos persistente – bronquitis", priority: "VERDE", ingreso: "11:30", waitMinutes: 38, status: "waiting" },
];

export default function Emergencias() {
  const [queue, setQueue] = useState<TriagePatient[]>(INITIAL);
  const [showForm, setShowForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", motive: "", priority: "VERDE" as TriagePatient["priority"] });

  const stats = {
    total: queue.length,
    critical: queue.filter((p) => p.priority === "ROJO").length,
    urgent: queue.filter((p) => p.priority === "NARANJA").length,
    attending: queue.filter((p) => p.status === "in-attention").length,
  };

  function handleAttend(id: string) {
    setQueue((prev) => prev.map((p) => p.id === id ? { ...p, status: "in-attention" as const } : p));
  }
  function handleDischarge(id: string) {
    setQueue((prev) => prev.map((p) => p.id === id ? { ...p, status: "done" as const } : p));
  }
  function handleAdd() {
    if (!newPatient.name || !newPatient.motive) return;
    const id = `t${Date.now()}`;
    const code = `EMG-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setQueue((prev) => [...prev, { id, code, patientName: newPatient.name, motive: newPatient.motive, priority: newPatient.priority, ingreso: time, waitMinutes: 0, status: "waiting" }]);
    setNewPatient({ name: "", motive: "", priority: "VERDE" });
    setShowForm(false);
  }

  const sorted = [...queue].sort((a, b) => {
    const order = { ROJO: 0, NARANJA: 1, AMARILLO: 2, VERDE: 3 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Emergencias" subtitle="Sistema de Triage y Atención Urgente" status="OPERATIVO" />

      <div className="flex-1 p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total en cola", value: stats.total, color: "text-slate-900", bg: "bg-slate-50" },
            { label: "Críticos (ROJO)", value: stats.critical, color: "text-red-600", bg: "bg-red-50" },
            { label: "Urgentes (NARANJA)", value: stats.urgent, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "En atención", value: stats.attending, color: "text-blue-600", bg: "bg-blue-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white/60`}>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-3xl mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Triage legend */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Escala de Triage Manchester</p>
          <div className="flex flex-wrap gap-2">
            {(["ROJO", "NARANJA", "AMARILLO", "VERDE"] as const).map((p) => {
              const cfg = priorityConfig[p];
              return (
                <div key={p} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.badge}`} />
                  <span className={`text-xs ${cfg.text}`}>{p} – {cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add patient */}
        <div className="flex items-center justify-between">
          <h3 className="text-slate-700">Cola de Atención</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Ingreso
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-200">
            <p className="text-sm text-slate-700 mb-3">Registrar nuevo paciente de emergencia</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                placeholder="Nombre del paciente (o NN)"
                value={newPatient.name}
                onChange={(e) => setNewPatient((prev) => ({ ...prev, name: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              <input
                placeholder="Motivo de consulta"
                value={newPatient.motive}
                onChange={(e) => setNewPatient((prev) => ({ ...prev, motive: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              <select
                value={newPatient.priority}
                onChange={(e) => setNewPatient((prev) => ({ ...prev, priority: e.target.value as TriagePatient["priority"] }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              >
                <option value="VERDE">VERDE – No urgente</option>
                <option value="AMARILLO">AMARILLO – Menos urgente</option>
                <option value="NARANJA">NARANJA – Urgente</option>
                <option value="ROJO">ROJO – Crítico</option>
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-[#2563eb] text-white text-sm rounded-lg hover:bg-blue-700">
                Registrar
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Queue table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-4 py-3">Código</th>
                <th className="text-left px-4 py-3">Paciente</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Motivo</th>
                <th className="text-left px-4 py-3">Prioridad</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Ingreso</th>
                <th className="text-left px-4 py-3">Espera</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((p) => {
                const cfg = priorityConfig[p.priority];
                return (
                  <tr key={p.id} className={`border-l-4 ${p.priority === "ROJO" ? "border-l-red-500" : p.priority === "NARANJA" ? "border-l-orange-500" : p.priority === "AMARILLO" ? "border-l-yellow-400" : "border-l-green-500"} hover:bg-slate-50 transition-colors ${p.status === "done" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-900 truncate max-w-[120px]">{p.patientName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell max-w-[180px]">
                      <span className="truncate block">{p.motive}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full text-white ${cfg.badge}`}>{p.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 hidden lg:table-cell">
                      <Clock className="w-3 h-3 inline mr-1" />{p.ingreso}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={p.waitMinutes > 20 ? "text-red-600" : "text-slate-600"}>
                        {p.waitMinutes}m
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "waiting" && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">En espera</span>}
                      {p.status === "in-attention" && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">En atención</span>}
                      {p.status === "done" && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Dado de alta</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {p.status === "waiting" && (
                          <button onClick={() => handleAttend(p.id)} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Atender
                          </button>
                        )}
                        {p.status === "in-attention" && (
                          <button onClick={() => handleDischarge(p.id)} className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Alta
                          </button>
                        )}
                        <button className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-300" />
              <p className="text-sm">Sin pacientes en cola de emergencias</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
