import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Can } from "../auth/usePermissions";
import { useEffect, type FormEvent } from "react";
import { exportBackup, fetchAuditEvents, type AuditEventRecord, type BackupExportResponse } from "../api/admin";
import { createUser, getUsers, setUserActive, type UserRecord } from "../api/auth";
import { fetchDoctors, type DoctorRecord } from "../api/doctors";
import { ROLE_LABELS, type UserRole } from "../auth/roles";
import { useAuth } from "../auth/AuthContext";
import { formatDateTime } from "../lib/format";
import { fetchCenterSettings, saveCenterSettings, type CenterSettings } from "../api/settings";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { AppearanceSettings } from "../components/AppearanceProvider";
import {
  Building2,
  Bell,
  Shield,
  Users,
  Palette,
  Database,
  Save,
  ChevronRight,
  Check,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  AlertCircle,
  LoaderCircle,
  UserPlus,
  UserCheck,
  UserX,
  Download,
  FileClock,
  RefreshCw,
} from "lucide-react";

const settingsSections = [
  { id: "general", label: "General", icon: Building2 },
  { id: "notifications", label: "Notificaciones", icon: Bell },
  { id: "security", label: "Seguridad", icon: Shield },
  { id: "users", label: "Usuarios", icon: Users },
  { id: "appearance", label: "Apariencia", icon: Palette },
  { id: "data", label: "Datos y Backup", icon: Database },
];

function GeneralSettings() {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CenterSettings>({ centerName: "", rut: "", address: "", phone: "", email: "", website: "", timezone: "America/Guatemala", language: "Español (Latinoamérica)" });
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchCenterSettings(controller.signal).then((data) => {
      if (!controller.signal.aborted) { setForm(data); setLoaded(true); }
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar la configuración.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const editForm = (data: CenterSettings) => { setForm(data); setSaved(false); };
  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    setError("");
    setSaving(true);
    try { const data = await saveCenterSettings(form); setForm(data); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la configuración."); }
    finally { setSaving(false); }
  };
  if (loading) return <p role="status" className="py-8 text-sm text-gray-500">Cargando configuración…</p>;
  if (!loaded) return <div className="space-y-4"><p role="alert" className="text-sm text-rose-700">{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="rounded-lg border px-4 py-2 text-sm">Reintentar</button></div>;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h3 className="text-gray-900 mb-1">Información del Centro</h3>
        <p className="text-sm text-gray-500">Datos generales del centro médico</p>
      </div>

      <fieldset disabled={saving} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="clinic-setting-centerName" className="text-sm text-gray-700">Nombre del Centro Médico</label>
          <input
            id="clinic-setting-centerName"
            required maxLength={120}
            value={form.centerName}
            onChange={(e) => editForm({ ...form, centerName: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="clinic-setting-rut" className="text-sm text-gray-700">RUT</label>
          <input
            id="clinic-setting-rut"
            value={form.rut}
            onChange={(e) => editForm({ ...form, rut: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="clinic-setting-phone" className="text-sm text-gray-700">Teléfono de Contacto</label>
          <div className="relative mt-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="clinic-setting-phone"
              value={form.phone}
              onChange={(e) => editForm({ ...form, phone: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="clinic-setting-email" className="text-sm text-gray-700">Email Institucional</label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="clinic-setting-email"
              type="email"
              value={form.email}
              onChange={(e) => editForm({ ...form, email: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="clinic-setting-website" className="text-sm text-gray-700">Sitio Web</label>
          <div className="relative mt-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="clinic-setting-website"
              value={form.website}
              onChange={(e) => editForm({ ...form, website: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="clinic-setting-address" className="text-sm text-gray-700">Dirección</label>
          <div className="relative mt-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="clinic-setting-address"
              value={form.address}
              onChange={(e) => editForm({ ...form, address: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="clinic-setting-timezone" className="text-sm text-gray-700">Zona Horaria</label>
          <div className="relative mt-1">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              id="clinic-setting-timezone"
              value={form.timezone}
              onChange={(e) => editForm({ ...form, timezone: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="America/Mexico_City">America/Mexico_City (GMT-6)</option>
              <option value="America/Guatemala">America/Guatemala (GMT-6)</option>
              <option value="America/Bogota">America/Bogota (GMT-5)</option>
              <option value="America/New_York">America/New_York (GMT-5)</option>
              <option value="Europe/Madrid">Europe/Madrid (GMT+2)</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="clinic-setting-language" className="text-sm text-gray-700">Idioma</label>
          <select
            id="clinic-setting-language"
            value={form.language}
            onChange={(e) => editForm({ ...form, language: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option>Español (Latinoamérica)</option>
            <option>English (US)</option>
          </select>
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {saved && <p role="status" className="text-sm text-emerald-700">Configuración guardada en el servidor.</p>}

      <Can module="settings" action="edit">
        <button
          type="submit"
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all ${
            saved ? "bg-green-600 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Guardando…" : saved ? "Guardado correctamente" : "Guardar cambios"}
        </button>
      </Can>
    </form>
  );
}

function NotificationsSettings() {
  return <div className="space-y-4"><h3 className="text-gray-900">Notificaciones</h3><p className="text-sm text-gray-500">Los avisos administrativos por correo se preparan, confirman y consultan en Correos. El administrador configura Resend y el remitente verificado en las variables del backend; las claves no se introducen aquí.</p><a href="/notificaciones" className="inline-flex min-h-11 items-center text-sm text-emerald-800 underline">Abrir Correos</a><p className="text-sm text-gray-500">No se envían recordatorios automáticos ni SMS. Las alertas de existencias y vencimiento se consultan en Laboratorio e Inventario.</p></div>;
}

const USER_ROLES: UserRole[] = ["admin", "medico", "enfermero", "fundacion", "recepcionista"];

function UsersSettings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "recepcionista" as UserRole,
    id_medico: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [userRows, doctorRows] = await Promise.all([getUsers(), fetchDoctors()]);
      setUsers(userRows);
      setDoctors(doctorRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await createUser({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        password: form.password,
        rol: form.rol,
        id_medico: form.rol === "medico" ? Number(form.id_medico) : null,
      });
      setUsers((current) => [...current, created]);
      setForm({ nombre: "", email: "", password: "", rol: "recepcionista", id_medico: "" });
      setShowForm(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (record: UserRecord) => {
    setError("");
    try {
      const updated = await setUserActive(record.id_usuario, !(record.activo ?? true));
      setUsers((current) => current.map((item) => item.id_usuario === record.id_usuario ? { ...item, ...updated } : item));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo actualizar el usuario.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-1 text-gray-900">Gestión de usuarios</h3>
          <p className="text-sm text-gray-500">Crea cuentas y controla el acceso por rol.</p>
        </div>
        <Can module="settings" action="create">
          <button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90">
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </button>
        </Can>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 sm:grid-cols-2">
          <UserInput label="Nombre completo" value={form.nombre} onChange={(value) => setForm((current) => ({ ...current, nombre: value }))} />
          <UserInput label="Correo electrónico" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
          <UserInput label="Contraseña temporal" type="password" minLength={8} value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} />
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-700">Rol</span>
            <select value={form.rol} onChange={(event) => setForm((current) => ({ ...current, rol: event.target.value as UserRole, id_medico: "" }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500">
              {USER_ROLES.map((role) => <option value={role} key={role}>{ROLE_LABELS[role]}</option>)}
            </select>
          </label>
          {form.rol === "medico" && (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm text-slate-700">Médico asociado</span>
              <select required value={form.id_medico} onChange={(event) => setForm((current) => ({ ...current, id_medico: event.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500">
                <option value="">Selecciona un médico</option>
                {doctors.map((doctor) => <option value={doctor.id_medico} key={doctor.id_medico}>{doctor.nombre} - {doctor.especialidad}</option>)}
              </select>
            </label>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setShowForm(false)} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600">Cancelar</button>
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{saving ? "Creando…" : "Crear usuario"}
            </button>
          </div>
        </form>
      )}

      {error && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4" />{error}</div>}

      {loading ? (
        <div className="flex justify-center py-14 text-slate-400"><LoaderCircle className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acción</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((record) => {
                  const active = record.activo ?? true;
                  const isSelf = record.id_usuario === currentUser?.id_usuario;
                  return (
                    <tr key={record.id_usuario} className="bg-white">
                      <td className="px-4 py-3"><p className="font-medium text-slate-900">{record.nombre}{isSelf && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">Tú</span>}</p><p className="mt-0.5 text-xs text-slate-500">{record.email}</p></td>
                      <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{ROLE_LABELS[record.rol]}</span></td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? "text-emerald-700" : "text-slate-400"}`}>{active ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}{active ? "Activo" : "Inactivo"}</span></td>
                      <td className="px-4 py-3 text-right"><Can module="settings" action="edit"><button type="button" disabled={isSelf} onClick={() => void toggle(record)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>{active ? "Desactivar" : "Activar"}</button></Can></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!users.length && <p className="py-10 text-center text-sm text-slate-400">No hay usuarios registrados.</p>}
        </div>
      )}
    </div>
  );
}

function UserInput({ label, value, onChange, type = "text", minLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; minLength?: number }) {
  return <label className="block"><span className="mb-1.5 block text-sm text-slate-700">{label}</span><input required type={type} minLength={minLength} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500" /></label>;
}

function DataBackupSettings() {
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [lastBackup, setLastBackup] = useState<BackupExportResponse | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadEvents = async (signal?: AbortSignal) => {
    setLoadingEvents(true);
    setError("");
    try {
      setEvents(await fetchAuditEvents(signal));
    } catch (loadError) {
      if (!signal?.aborted) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la auditoria.");
      }
    } finally {
      if (!signal?.aborted) setLoadingEvents(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadEvents(controller.signal);
    return () => controller.abort();
  }, []);

  const downloadBackup = async () => {
    setExporting(true);
    setError("");
    setSuccess("");

    try {
      const backup = await exportBackup();
      setLastBackup(backup);

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `centro-medico-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setSuccess("Respaldo generado y descargado correctamente.");
      await loadEvents();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "No se pudo generar el respaldo.");
    } finally {
      setExporting(false);
    }
  };

  const counts = Object.entries(lastBackup?.counts || {}).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-1 text-gray-900">Datos y Backup</h3>
          <p className="text-sm text-gray-500">Exporta datos administrativos y revisa movimientos recientes.</p>
        </div>
        <button
          type="button"
          onClick={() => void downloadBackup()}
          disabled={exporting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? "Generando..." : "Descargar backup"}
        </button>
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4" />{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{success}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Ultimo respaldo</p>
              <p className="text-xs text-slate-500">
                {lastBackup ? formatDateTime(lastBackup.exportedAt) : "Sin exportacion en esta sesion"}
              </p>
            </div>
          </div>

          {counts.length ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {counts.map(([key, value]) => (
                <div key={key} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="truncate text-xs text-slate-500">{key}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
              Genera un backup para ver el conteo exportado.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileClock className="h-4 w-4 text-slate-500" />
              <h4 className="text-sm font-semibold text-slate-900">Auditoria reciente</h4>
            </div>
            <button
              type="button"
              onClick={() => void loadEvents()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recargar
            </button>
          </div>

          {loadingEvents ? (
            <div className="flex justify-center py-12 text-slate-400">
              <LoaderCircle className="h-6 w-6 animate-spin" />
            </div>
          ) : events.length ? (
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id_evento} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{event.accion}</p>
                    <span className="text-xs text-slate-400">{formatDateTime(event.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {event.descripcion || event.entidad}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {event.usuario_nombre || event.usuario_email || "Sistema"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-400">
              Aun no hay eventos de auditoria registrados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState("general");

  const renderContent = () => {
    switch (activeSection) {
      case "general": return <GeneralSettings />;
      case "notifications": return <NotificationsSettings />;
      case "security": return <ChangePasswordForm className="space-y-6" />;
      case "users": return <UsersSettings />;
      case "appearance": return <AppearanceSettings />;
      case "data": return <DataBackupSettings />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Configuración" subtitle="Administración del sistema" />

      <div className="flex-1 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar nav */}
          <div className="w-full md:w-56 flex-shrink-0">
            <nav className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors border-b border-gray-50 last:border-0 ${
                    activeSection === section.id
                      ? "bg-accent text-accent-foreground"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{section.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

