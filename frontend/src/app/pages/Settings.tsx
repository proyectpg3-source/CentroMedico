import { useState } from "react";
import { Header } from "../components/layout/Header";
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
  const [form, setForm] = useState({
    centerName: "Centro Médico La Aurora",
    rut: "CM-2026-001",
    address: "Boulevard principal, zona clínica",
    phone: "+52 55 0000 0000",
    email: "direccion@laaurora.salud",
    website: "www.laaurora.salud",
    timezone: "America/Mexico_City",
    language: "Español (Latinoamérica)",
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-gray-900 mb-1">Información del Centro</h3>
        <p className="text-sm text-gray-500">Datos generales del centro médico</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm text-gray-700">Nombre del Centro Médico</label>
          <input
            value={form.centerName}
            onChange={(e) => setForm({ ...form, centerName: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-sm text-gray-700">RUT</label>
          <input
            value={form.rut}
            onChange={(e) => setForm({ ...form, rut: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-sm text-gray-700">Teléfono de Contacto</label>
          <div className="relative mt-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-700">Email Institucional</label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-700">Sitio Web</label>
          <div className="relative mt-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="col-span-2">
          <label className="text-sm text-gray-700">Dirección</label>
          <div className="relative mt-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-700">Zona Horaria</label>
          <div className="relative mt-1">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
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
          <label className="text-sm text-gray-700">Idioma</label>
          <select
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option>Español (Latinoamérica)</option>
            <option>English (US)</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all ${
          saved ? "bg-green-600 text-white" : "bg-[#2563eb] text-white hover:bg-blue-700"
        }`}
      >
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "Guardado correctamente" : "Guardar cambios"}
      </button>
    </div>
  );
}

function NotificationsSettings() {
  const [settings, setSettings] = useState({
    emailReminders: true,
    smsReminders: false,
    appointmentConfirm: true,
    cancellations: true,
    newPatients: true,
    systemAlerts: true,
    weeklyReport: false,
    monthlyReport: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const items: { key: keyof typeof settings; label: string; desc: string }[] = [
    { key: "emailReminders", label: "Recordatorios por Email", desc: "Enviar recordatorio 24h antes de la cita" },
    { key: "smsReminders", label: "Recordatorios por SMS", desc: "Enviar recordatorio por mensaje de texto" },
    { key: "appointmentConfirm", label: "Confirmación de Citas", desc: "Notificar cuando se confirma una cita" },
    { key: "cancellations", label: "Cancelaciones", desc: "Alertar cuando se cancela una cita" },
    { key: "newPatients", label: "Nuevos Pacientes", desc: "Notificar cuando se registra un nuevo paciente" },
    { key: "systemAlerts", label: "Alertas del Sistema", desc: "Recibir alertas críticas del sistema" },
    { key: "weeklyReport", label: "Reporte Semanal", desc: "Recibir resumen semanal por email" },
    { key: "monthlyReport", label: "Reporte Mensual", desc: "Recibir resumen mensual por email" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-gray-900 mb-1">Configuración de Notificaciones</h3>
        <p className="text-sm text-gray-500">Elige qué notificaciones deseas recibir</p>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                settings[item.key] ? "bg-[#2563eb]" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings[item.key] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderSection({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      <div className="p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center">
        <p className="text-gray-400 text-sm">Esta sección estará disponible próximamente.</p>
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
      case "security": return <PlaceholderSection title="Seguridad" desc="Gestión de contraseñas, autenticación y permisos" />;
      case "users": return <PlaceholderSection title="Gestión de Usuarios" desc="Administra los usuarios y roles del sistema" />;
      case "appearance": return <PlaceholderSection title="Apariencia" desc="Personaliza el aspecto visual del sistema" />;
      case "data": return <PlaceholderSection title="Datos y Backup" desc="Gestiona respaldos y exportación de datos" />;
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
                      ? "bg-blue-50 text-[#2563eb]"
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

