import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import {
  createDoctor,
  fetchDoctors,
  removeDoctor,
  updateDoctor,
  type DoctorPayload,
  type DoctorRecord,
} from "../api/doctors";
import {
  Calendar,
  Edit2,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Shield,
  Stethoscope,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";

interface DoctorFormState {
  nombre: string;
  especialidad: string;
  licencia: string;
}

type DoctorFormModalState =
  | {
      mode: "create" | "edit";
      doctor: DoctorRecord | null;
    }
  | null;

function normalizeDoctor(doctor: DoctorRecord): DoctorRecord {
  return {
    ...doctor,
    total_citas: doctor.total_citas ?? 0,
  };
}

function buildDoctorFormState(doctor: DoctorRecord | null): DoctorFormState {
  if (!doctor) {
    return {
      nombre: "",
      especialidad: "",
      licencia: "",
    };
  }

  return {
    nombre: doctor.nombre,
    especialidad: doctor.especialidad,
    licencia: doctor.licencia || "",
  };
}

function toDoctorPayload(form: DoctorFormState): DoctorPayload {
  return {
    nombre: form.nombre.trim(),
    especialidad: form.especialidad.trim(),
    licencia: form.licencia.trim() || null,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getDoctorInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function InfoItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function DoctorModal({
  doctor,
  onClose,
  onEdit,
}: {
  doctor: DoctorRecord;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="relative">
          <div className="h-28 bg-gradient-to-r from-[#0c1a3a] to-[#2563eb] rounded-t-2xl" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb] text-xl">
                {getDoctorInitials(doctor.nombre)}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-14 px-6 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-gray-900">{doctor.nombre}</h3>
              <p className="text-sm text-[#2563eb] mt-0.5">{doctor.especialidad}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">
              Registrado
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-lg text-[#2563eb]">{doctor.total_citas || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Citas asociadas</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-lg text-slate-700">{doctor.licencia ? "Si" : "No"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Licencia registrada</p>
            </div>
          </div>

          <div className="space-y-4 mt-5">
            <InfoItem
              label="Especialidad"
              value={doctor.especialidad}
              icon={<Stethoscope className="w-4 h-4 text-gray-400" />}
            />
            <InfoItem
              label="Licencia"
              value={doctor.licencia || "No registrada"}
              icon={<Shield className="w-4 h-4 text-gray-400" />}
            />
            <InfoItem
              label="Carga actual"
              value={`${doctor.total_citas || 0} cita(s) asociada(s)`}
              icon={<Calendar className="w-4 h-4 text-gray-400" />}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-[#2563eb] text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Editar medico
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DoctorFormModal({
  mode,
  doctor,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  mode: "create" | "edit";
  doctor: DoctorRecord | null;
  onClose: () => void;
  onSubmit: (form: DoctorFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<DoctorFormState>(() => buildDoctorFormState(doctor));

  useEffect(() => {
    setForm(buildDoctorFormState(doctor));
  }, [doctor]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-gray-900">{mode === "create" ? "Nuevo Medico" : "Editar Medico"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="text-sm text-gray-700">Nombre completo *</label>
            <input
              required
              value={form.nombre}
              onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Ej: Dra. Maria Gonzalez"
            />
          </div>

          <div>
            <label className="text-sm text-gray-700">Especialidad *</label>
            <input
              required
              value={form.especialidad}
              onChange={(event) =>
                setForm((current) => ({ ...current, especialidad: event.target.value }))
              }
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Ej: Cardiologia"
            />
          </div>

          <div>
            <label className="text-sm text-gray-700">Licencia</label>
            <input
              value={form.licencia}
              onChange={(event) => setForm((current) => ({ ...current, licencia: event.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Ej: MED-CAR-001"
            />
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Esta pantalla usa directamente la API real de `/api/medicos`.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-[#2563eb] text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "create" ? "Registrar medico" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDoctorModal({
  doctor,
  onClose,
  onConfirm,
  isDeleting,
}: {
  doctor: DoctorRecord;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
            <Trash2 className="w-5 h-5" />
          </div>
          <h2 className="text-gray-900">Eliminar medico</h2>
          <p className="text-sm text-gray-500 mt-2">
            Esta accion eliminara a <strong className="text-gray-700">{doctor.nombre}</strong> del sistema.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Doctors() {
  const [search, setSearch] = useState("");
  const [filterSpec, setFilterSpec] = useState("Todas");
  const [doctorList, setDoctorList] = useState<DoctorRecord[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRecord | null>(null);
  const [doctorForm, setDoctorForm] = useState<DoctorFormModalState>(null);
  const [doctorToDelete, setDoctorToDelete] = useState<DoctorRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadDoctors(signal?: AbortSignal) {
    try {
      setError(null);
      setLoading(true);
      const doctors = await fetchDoctors(undefined, signal);
      setDoctorList(doctors.map(normalizeDoctor));
    } catch (fetchError) {
      if (signal?.aborted) {
        return;
      }

      setError(getErrorMessage(fetchError, "No se pudieron cargar los medicos."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadDoctors(controller.signal);

    return () => controller.abort();
  }, []);

  const specialties = [
    "Todas",
    ...Array.from(new Set(doctorList.map((doctor) => doctor.especialidad))).sort(),
  ];

  const filtered = doctorList.filter((doctor) => {
    const matchSearch =
      doctor.nombre.toLowerCase().includes(search.toLowerCase()) ||
      doctor.especialidad.toLowerCase().includes(search.toLowerCase()) ||
      (doctor.licencia || "").toLowerCase().includes(search.toLowerCase());
    const matchSpec = filterSpec === "Todas" || doctor.especialidad === filterSpec;
    return matchSearch && matchSpec;
  });

  const doctorsWithLicense = doctorList.filter((doctor) => Boolean(doctor.licencia)).length;
  const totalAppointments = doctorList.reduce(
    (total, doctor) => total + (doctor.total_citas || 0),
    0
  );

  async function handleSubmit(form: DoctorFormState) {
    if (!doctorForm) {
      return;
    }

    const payload = toDoctorPayload(form);
    const activeForm = doctorForm;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (activeForm.mode === "edit" && activeForm.doctor) {
        const updatedDoctor = normalizeDoctor(
          await updateDoctor(activeForm.doctor.id_medico, payload)
        );
        setDoctorList((current) =>
          current.map((doctor) =>
            doctor.id_medico === updatedDoctor.id_medico ? updatedDoctor : doctor
          )
        );

        if (selectedDoctor?.id_medico === updatedDoctor.id_medico) {
          setSelectedDoctor(updatedDoctor);
        }
      } else {
        const createdDoctor = normalizeDoctor(await createDoctor(payload));
        setDoctorList((current) => [createdDoctor, ...current]);
      }

      setDoctorForm(null);
    } catch (submitActionError) {
      setSubmitError(getErrorMessage(submitActionError, "No se pudo guardar el medico."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!doctorToDelete) {
      return;
    }

    const doctorId = doctorToDelete.id_medico;
    setDeletingId(doctorId);
    setError(null);

    try {
      await removeDoctor(doctorId);
      setDoctorList((current) => current.filter((doctor) => doctor.id_medico !== doctorId));
      setDoctorToDelete(null);

      if (selectedDoctor?.id_medico === doctorId) {
        setSelectedDoctor(null);
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "No se pudo eliminar el medico."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Medicos" subtitle={`${doctorList.length} profesionales registrados`} />

      <div className="flex-1 p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: "Total medicos",
              value: doctorList.length,
              icon: Users,
              bg: "bg-blue-50",
              text: "text-blue-600",
            },
            {
              label: "Especialidades",
              value: Math.max(specialties.length - 1, 0),
              icon: Stethoscope,
              bg: "bg-green-50",
              text: "text-green-600",
            },
            {
              label: "Con licencia",
              value: doctorsWithLicense,
              icon: Shield,
              bg: "bg-amber-50",
              text: "text-amber-600",
            },
            {
              label: "Citas asignadas",
              value: totalAppointments,
              icon: Calendar,
              bg: "bg-slate-100",
              text: "text-slate-700",
            },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl text-gray-900 mt-1">{loading ? "..." : card.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.text}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <TriangleAlert className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-800">No se pudo sincronizar la lista de medicos.</p>
                <p className="text-sm text-amber-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => void loadDoctors()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, especialidad o licencia..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={filterSpec}
            onChange={(event) => setFilterSpec(event.target.value)}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          >
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSubmitError(null);
              setDoctorForm({ mode: "create", doctor: null });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white text-sm rounded-lg hover:bg-blue-700 transition-colors ml-auto"
          >
            <Plus className="w-4 h-4" />
            Nuevo Medico
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#2563eb]" />
            <p className="text-sm">Cargando medicos desde la API...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <p className="text-gray-500">No se encontraron medicos con esos criterios.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((doctor) => (
              <div
                key={doctor.id_medico}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedDoctor(doctor)}
              >
                <div className="h-16 bg-gradient-to-r from-[#0c1a3a] to-[#1e40af]" />
                <div className="px-5 pb-5">
                  <div className="relative -mt-8 mb-3 flex items-start justify-between gap-3">
                    <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb]">
                        {getDoctorInitials(doctor.nombre)}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-8">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setSubmitError(null);
                          setDoctorForm({ mode: "edit", doctor });
                        }}
                        className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setDoctorToDelete(doctor);
                        }}
                        className="w-8 h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-gray-900 truncate">{doctor.nombre}</h4>
                  <p className="text-sm text-[#2563eb] truncate">{doctor.especialidad}</p>

                  <span className="inline-flex text-xs px-2 py-0.5 rounded-full mt-2 bg-slate-100 text-slate-700">
                    {doctor.licencia || "Sin licencia"}
                  </span>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-sm text-gray-900">{doctor.total_citas || 0}</p>
                      <p className="text-xs text-gray-400">Citas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-900">{doctor.licencia ? "Si" : "No"}</p>
                      <p className="text-xs text-gray-400">Licencia</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDoctor && (
        <DoctorModal
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onEdit={() => {
            setSubmitError(null);
            setSelectedDoctor(null);
            setDoctorForm({ mode: "edit", doctor: selectedDoctor });
          }}
        />
      )}

      {doctorForm && (
        <DoctorFormModal
          mode={doctorForm.mode}
          doctor={doctorForm.doctor}
          onClose={() => setDoctorForm(null)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}

      {doctorToDelete && (
        <DeleteDoctorModal
          doctor={doctorToDelete}
          onClose={() => setDoctorToDelete(null)}
          onConfirm={() => void handleDelete()}
          isDeleting={deletingId === doctorToDelete.id_medico}
        />
      )}
    </div>
  );
}
