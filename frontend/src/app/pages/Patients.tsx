import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { Can } from "../auth/usePermissions";
import {
  createPatient,
  fetchPatients,
  removePatient,
  type PatientPayload,
  type PatientRecord,
  updatePatient,
} from "../api/patients";
import {
  CalendarDays,
  CheckCircle2,
  Edit2,
  Eye,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TriangleAlert,
  UserRound,
  Users,
  X,
} from "lucide-react";

interface PatientFormState {
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  fecha_nacimiento: string;
  sexo: "femenino" | "masculino" | "otro" | "no_indicado";
  residencia: string;
  contacto_emergencia: string;
}

type PatientFormModalState =
  | {
      mode: "create" | "edit";
      patient: PatientRecord | null;
    }
  | null;

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatPatientDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(date);
}

function getPatientInitials(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function buildFormState(patient: PatientRecord | null): PatientFormState {
  if (!patient) {
    return {
      nombre: "",
      dni: "",
      telefono: "",
      email: "",
      fecha_nacimiento: "",
      sexo: "no_indicado",
      residencia: "",
      contacto_emergencia: "",
    };
  }

  return {
    nombre: patient.nombre,
    dni: patient.dni,
    telefono: patient.telefono || "",
    email: patient.email || "",
    fecha_nacimiento: patient.fecha_nacimiento?.slice(0, 10) || "",
    sexo: patient.sexo || "no_indicado",
    residencia: patient.residencia || "",
    contacto_emergencia: patient.contacto_emergencia || "",
  };
}

function toPayload(form: PatientFormState): PatientPayload {
  return {
    nombre: form.nombre.trim(),
    dni: form.dni.trim(),
    telefono: form.telefono.trim() || null,
    email: form.email.trim() || null,
    fecha_nacimiento: form.fecha_nacimiento || null,
    sexo: form.sexo,
    residencia: form.residencia.trim() || null,
    contacto_emergencia: form.contacto_emergencia.trim() || null,
  };
}

function getAge(birthDate: string | null | undefined) {
  if (!birthDate) return "No registrada";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "No registrada";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) age -= 1;
  return `${age} años`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function PatientModal({ patient, onClose }: { patient: PatientRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-gray-900">Ficha del Paciente</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-[#2563eb]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl text-[#2563eb]">{getPatientInitials(patient.nombre)}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-gray-900">{patient.nombre}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                  DNI: {patient.dni}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">
                  Registro activo
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem
              icon={<IdCard className="w-4 h-4 text-gray-400" />}
              label="Documento"
              value={patient.dni}
            />
            <InfoItem
              icon={<CalendarDays className="w-4 h-4 text-gray-400" />}
              label="Fecha de registro"
              value={formatPatientDate(patient.fecha_registro)}
            />
            <InfoItem
              icon={<Phone className="w-4 h-4 text-gray-400" />}
              label="Teléfono"
              value={patient.telefono || "No registrado"}
            />
            <InfoItem
              icon={<Mail className="w-4 h-4 text-gray-400" />}
              label="Email"
              value={patient.email || "No registrado"}
            />
            <InfoItem
              icon={<CalendarDays className="w-4 h-4 text-gray-400" />}
              label="Edad"
              value={getAge(patient.fecha_nacimiento)}
            />
            <InfoItem
              icon={<UserRound className="w-4 h-4 text-gray-400" />}
              label="Sexo"
              value={(patient.sexo || "No indicado").replace("_", " ")}
            />
            <InfoItem
              icon={<MapPin className="w-4 h-4 text-gray-400" />}
              label="Residencia"
              value={patient.residencia || "No registrada"}
            />
            <InfoItem
              icon={<Phone className="w-4 h-4 text-gray-400" />}
              label="Contacto de emergencia"
              value={patient.contacto_emergencia || "No registrado"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientFormModal({
  mode,
  patient,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  mode: "create" | "edit";
  patient: PatientRecord | null;
  onClose: () => void;
  onSubmit: (form: PatientFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<PatientFormState>(() => buildFormState(patient));

  useEffect(() => {
    setForm(buildFormState(patient));
  }, [patient]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-gray-900">{mode === "create" ? "Nuevo Paciente" : "Editar Paciente"}</h2>
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
              placeholder="Ej: Juan Perez Gonzalez"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-700">DNI *</label>
              <input
                required
                value={form.dni}
                onChange={(event) => setForm((current) => ({ ...current, dni: event.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Documento del paciente"
              />
            </div>

            <div>
              <label className="text-sm text-gray-700">Teléfono</label>
              <input
                value={form.telefono}
                onChange={(event) => setForm((current) => ({ ...current, telefono: event.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="+52 ..."
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-gray-700">Fecha de nacimiento</label>
              <input
                type="date"
                value={form.fecha_nacimiento}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fecha_nacimiento: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">Sexo</label>
              <select
                value={form.sexo}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sexo: event.target.value as PatientFormState["sexo"],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="no_indicado">No indicado</option>
                <option value="femenino">Femenino</option>
                <option value="masculino">Masculino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-700">Residencia o direccion</label>
            <input
              value={form.residencia}
              onChange={(event) =>
                setForm((current) => ({ ...current, residencia: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Municipio, aldea, canton o direccion"
            />
          </div>

          <div>
            <label className="text-sm text-gray-700">Contacto de emergencia</label>
            <input
              value={form.contacto_emergencia}
              onChange={(event) =>
                setForm((current) => ({ ...current, contacto_emergencia: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Nombre, parentesco y telefono"
            />
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
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "create" ? "Registrar Paciente" : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeletePatientModal({
  patient,
  onClose,
  onConfirm,
  isDeleting,
}: {
  patient: PatientRecord;
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
          <h2 className="text-gray-900">Eliminar paciente</h2>
          <p className="text-sm text-gray-500 mt-2">
            Esta acción eliminará a <strong className="text-gray-700">{patient.nombre}</strong> del sistema.
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

export default function Patients() {
  const [search, setSearch] = useState("");
  const [patientList, setPatientList] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [patientForm, setPatientForm] = useState<PatientFormModalState>(null);
  const [patientToDelete, setPatientToDelete] = useState<PatientRecord | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadPatients(signal?: AbortSignal) {
    try {
      setError(null);
      setLoading(true);
      const patients = await fetchPatients(signal);
      setPatientList(patients);
    } catch (fetchError) {
      if (signal?.aborted) {
        return;
      }

      setError(getErrorMessage(fetchError, "No se pudieron cargar los pacientes."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadPatients(controller.signal);

    return () => controller.abort();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = patientList.filter((patient) => {
    if (!normalizedSearch) {
      return true;
    }

    return [
      patient.nombre,
      patient.dni,
      patient.telefono || "",
      patient.email || "",
      patient.residencia || "",
      patient.contacto_emergencia || "",
    ].some((value) =>
      value.toLowerCase().includes(normalizedSearch)
    );
  });

  const todayKey = toLocalDateKey();
  const currentMonth = todayKey.slice(0, 7);
  const patientsWithPhone = patientList.filter((patient) => Boolean(patient.telefono)).length;
  const patientsWithEmail = patientList.filter((patient) => Boolean(patient.email)).length;
  const registeredThisMonth = patientList.filter((patient) => patient.fecha_registro.startsWith(currentMonth)).length;

  async function handleSubmit(form: PatientFormState) {
    if (!patientForm) {
      return;
    }

    const payload = toPayload(form);
    const activeForm = patientForm;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (activeForm.mode === "edit" && activeForm.patient) {
        const updatedPatient = await updatePatient(activeForm.patient.id_paciente, payload);
        setPatientList((current) =>
          current.map((patient) =>
            patient.id_paciente === updatedPatient.id_paciente ? updatedPatient : patient
          )
        );
      } else {
        const createdPatient = await createPatient(payload);
        setPatientList((current) => [createdPatient, ...current]);
      }

      setPatientForm(null);
    } catch (submitActionError) {
      setSubmitError(getErrorMessage(submitActionError, "No se pudo guardar el paciente."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!patientToDelete) {
      return;
    }

    const patientId = patientToDelete.id_paciente;
    setDeletingId(patientId);
    setError(null);

    try {
      await removePatient(patientId);
      setPatientList((current) => current.filter((patient) => patient.id_paciente !== patientId));
      setPatientToDelete(null);

      if (selectedPatient?.id_paciente === patientId) {
        setSelectedPatient(null);
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "No se pudo eliminar el paciente."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Pacientes"
        subtitle={`${patientList.length} pacientes sincronizados con la base de datos`}
      />

      <div className="flex-1 p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: "Total pacientes",
              value: patientList.length,
              icon: Users,
              bg: "bg-blue-50",
              text: "text-blue-600",
            },
            {
              label: "Con telefono",
              value: patientsWithPhone,
              icon: Phone,
              bg: "bg-green-50",
              text: "text-green-600",
            },
            {
              label: "Con email",
              value: patientsWithEmail,
              icon: Mail,
              bg: "bg-amber-50",
              text: "text-amber-600",
            },
            {
              label: "Altas del mes",
              value: registeredThisMonth,
              icon: CalendarDays,
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
                <p className="text-sm text-amber-800">No se pudo sincronizar la lista de pacientes.</p>
                <p className="text-sm text-amber-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => void loadPatients()}
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
              placeholder="Buscar por nombre, DNI, email o telefono..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <Can module="patients" action="create">
            <button
              onClick={() => {
                setSubmitError(null);
                setPatientForm({ mode: "create", patient: null });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors ml-auto"
            >
              <Plus className="w-4 h-4" />
              Nuevo Paciente
            </button>
          </Can>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#2563eb]" />
              <p className="text-sm">Cargando pacientes desde la API...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wide">
                        Paciente
                      </th>
                      <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wide">
                        DNI
                      </th>
                      <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wide">
                        Contacto
                      </th>
                      <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wide">
                        Fecha de registro
                      </th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                          No se encontraron pacientes con esos criterios.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((patient) => (
                        <tr key={patient.id_paciente} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#2563eb]/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm text-[#2563eb]">{getPatientInitials(patient.nombre)}</span>
                              </div>
                              <div>
                                <p className="text-sm text-gray-900">{patient.nombre}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                                    <CheckCircle2 className="w-3 h-3" />
                                    API
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-sm text-gray-700">{patient.dni}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-sm text-gray-700">{patient.telefono || "Sin telefono"}</p>
                            <p className="text-xs text-gray-400">{patient.email || "Sin email"}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-sm text-gray-700">{formatPatientDate(patient.fecha_registro)}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setOpenMenu((current) =>
                                    current === patient.id_paciente ? null : patient.id_paciente
                                  )
                                }
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </button>

                              {openMenu === patient.id_paciente && (
                                <div className="absolute right-0 top-9 z-10 bg-white rounded-lg shadow-lg border border-gray-100 py-1 w-44">
                                  <button
                                    onClick={() => {
                                      setSelectedPatient(patient);
                                      setOpenMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Eye className="w-4 h-4" />
                                    Ver ficha
                                  </button>
                                  <Can module="patients" action="edit">
                                    <button
                                      onClick={() => {
                                        setSubmitError(null);
                                        setPatientForm({ mode: "edit", patient });
                                        setOpenMenu(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                      Editar
                                    </button>
                                  </Can>
                                  <Can module="patients" action="delete">
                                    <button
                                      onClick={() => {
                                        setPatientToDelete(patient);
                                        setOpenMenu(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Eliminar
                                    </button>
                                  </Can>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Mostrando {filtered.length} de {patientList.length} pacientes
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedPatient && (
        <PatientModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
      )}

      {patientForm && (
        <PatientFormModal
          mode={patientForm.mode}
          patient={patientForm.patient}
          onClose={() => setPatientForm(null)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}

      {patientToDelete && (
        <DeletePatientModal
          patient={patientToDelete}
          onClose={() => setPatientToDelete(null)}
          onConfirm={() => void handleDelete()}
          isDeleting={deletingId === patientToDelete.id_paciente}
        />
      )}
    </div>
  );
}
