import { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  Plus,
  Search,
  User,
} from "lucide-react";
import { Header } from "../components/layout/Header";
import { Can } from "../auth/usePermissions";
import {
  createAppointment,
  fetchAppointments,
  updateAppointmentStatus,
  type AppointmentRecord,
  type AppointmentStatus,
} from "../api/appointments";
import { fetchPatients, type PatientRecord } from "../api/patients";
import { fetchDoctors, type DoctorRecord } from "../api/doctors";
import { getErrorMessage, toDateInputValue, toDateTimePayload, toTimeInputValue } from "../lib/format";

const statusConfig: Record<AppointmentStatus, { label: string; bg: string; text: string }> = {
  pendiente: { label: "En espera", bg: "bg-amber-100", text: "text-amber-700" },
  confirmada: { label: "Registrado", bg: "bg-blue-100", text: "text-blue-700" },
  en_curso: { label: "Llamado", bg: "bg-purple-100", text: "text-purple-700" },
  completada: { label: "Atendido", bg: "bg-green-100", text: "text-green-700" },
  cancelada: { label: "Cancelada", bg: "bg-slate-100", text: "text-slate-500" },
};

function isToday(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

interface NewVisitForm {
  id_paciente: string;
  id_medico: string;
  motivo: string;
  time: string;
}

export default function Recepcion() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [newVisit, setNewVisit] = useState<NewVisitForm>({
    id_paciente: "",
    id_medico: "",
    motivo: "Consulta",
    time: toTimeInputValue(),
  });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [appointmentsData, patientsData, doctorsData] = await Promise.all([
          fetchAppointments(undefined, controller.signal),
          fetchPatients(controller.signal),
          fetchDoctors(undefined, controller.signal),
        ]);
        setAppointments(appointmentsData);
        setPatients(patientsData);
        setDoctors(doctorsData);
        setNewVisit((prev) => ({
          ...prev,
          id_paciente: prev.id_paciente || (patientsData[0] ? String(patientsData[0].id_paciente) : ""),
          id_medico: prev.id_medico || (doctorsData[0] ? String(doctorsData[0].id_medico) : ""),
        }));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(getErrorMessage(err, "No se pudo cargar la información de recepción."));
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const todaysAppointments = appointments.filter((a) => isToday(a.fecha_hora));

  const filtered = todaysAppointments.filter((a) => {
    const term = search.toLowerCase();
    return (
      (a.paciente_nombre || "").toLowerCase().includes(term) ||
      (a.medico_nombre || "").toLowerCase().includes(term)
    );
  });

  const stats = {
    total: todaysAppointments.length,
    waiting: todaysAppointments.filter((a) => a.estado === "pendiente" || a.estado === "confirmada").length,
    called: todaysAppointments.filter((a) => a.estado === "en_curso").length,
    attended: todaysAppointments.filter((a) => a.estado === "completada").length,
  };

  async function handleStatusChange(appointment: AppointmentRecord, estado: AppointmentStatus) {
    setUpdatingId(appointment.id_cita);
    setError(null);
    try {
      const updated = await updateAppointmentStatus(appointment.id_cita, estado);
      setAppointments((prev) => prev.map((a) => (a.id_cita === updated.id_cita ? updated : a)));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo actualizar el estado de la cita."));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRegister() {
    setFormError(null);

    if (!newVisit.id_paciente || !newVisit.id_medico) {
      setFormError("Selecciona paciente y médico.");
      return;
    }
    if (!newVisit.time) {
      setFormError("Indica la hora de la visita.");
      return;
    }

    setSaving(true);
    try {
      const fecha_hora = toDateTimePayload(toDateInputValue(), newVisit.time);
      const created = await createAppointment({
        id_paciente: Number(newVisit.id_paciente),
        id_medico: Number(newVisit.id_medico),
        fecha_hora,
        motivo: newVisit.motivo || null,
        estado: "pendiente",
      });
      setAppointments((prev) => [...prev, created]);
      setShowRegister(false);
      setNewVisit((prev) => ({ ...prev, motivo: "Consulta", time: toTimeInputValue() }));
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo registrar la visita."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Recepción" subtitle="Registro y control de visitas del día" />

      <div className="flex-1 p-5 space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total del día", value: stats.total, color: "text-slate-900", bg: "bg-white" },
            { label: "En espera", value: stats.waiting, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "En atención", value: stats.called, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Atendidos", value: stats.attended, color: "text-green-600", bg: "bg-green-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 shadow-sm border border-slate-100`}>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-3xl mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick register */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Buscar paciente o doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white rounded-2xl border border-gray-200 focus:outline-none focus:border-blue-400"
            />
          </div>
          <Can module="appointments" action="create">
            <button
              onClick={() => setShowRegister(!showRegister)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" /> Registrar Visita
            </button>
          </Can>
        </div>

        <Can module="appointments" action="create">
          {showRegister && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-200 space-y-3">
              <p className="text-sm text-slate-700">Registro de visita / Check-in</p>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select
                  value={newVisit.id_paciente}
                  onChange={(e) => setNewVisit((p) => ({ ...p, id_paciente: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                >
                  <option value="">Selecciona paciente</option>
                  {patients.map((p) => (
                    <option key={p.id_paciente} value={p.id_paciente}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <select
                  value={newVisit.id_medico}
                  onChange={(e) => setNewVisit((p) => ({ ...p, id_medico: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                >
                  <option value="">Selecciona médico</option>
                  {doctors.map((d) => (
                    <option key={d.id_medico} value={d.id_medico}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Motivo de la visita"
                  value={newVisit.motivo}
                  onChange={(e) => setNewVisit((p) => ({ ...p, motivo: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
                <input
                  type="time"
                  value={newVisit.time}
                  onChange={(e) => setNewVisit((p) => ({ ...p, time: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRegister}
                  disabled={saving}
                  className="px-4 py-2 bg-[#2563eb] text-white text-sm rounded-lg disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Registrar"}
                </button>
                <button
                  onClick={() => setShowRegister(false)}
                  className="px-4 py-2 border border-gray-200 text-slate-600 text-sm rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </Can>

        {/* Patients list */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-slate-50">
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Visitas del día – {new Date().toLocaleDateString("es-GT")}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando visitas...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-4 py-3">Paciente</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Doctor</th>
                  <th className="text-left px-4 py-3">Hora</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Motivo</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => {
                  const sc = statusConfig[a.estado];
                  const isUpdating = updatingId === a.id_cita;
                  return (
                    <tr key={a.id_cita} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <span className="text-sm text-slate-900 truncate max-w-[140px]">
                            {a.paciente_nombre || "Paciente sin nombre"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell truncate max-w-[140px]">
                        {a.medico_nombre || "Sin asignar"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(a.fecha_hora).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden lg:table-cell truncate max-w-[160px]">
                        {a.motivo || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Can module="appointments" action="edit">
                          <div className="flex items-center gap-1.5">
                            {a.estado === "pendiente" && (
                              <button
                                onClick={() => handleStatusChange(a, "confirmada")}
                                disabled={isUpdating}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-60"
                              >
                                Check-in
                              </button>
                            )}
                            {a.estado === "confirmada" && (
                              <button
                                onClick={() => handleStatusChange(a, "en_curso")}
                                disabled={isUpdating}
                                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-1 disabled:opacity-60"
                              >
                                <Phone className="w-3 h-3" /> Llamar
                              </button>
                            )}
                            {a.estado === "en_curso" && (
                              <button
                                onClick={() => handleStatusChange(a, "completada")}
                                disabled={isUpdating}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1 disabled:opacity-60"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Atendido
                              </button>
                            )}
                          </div>
                        </Can>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Sin visitas registradas</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
