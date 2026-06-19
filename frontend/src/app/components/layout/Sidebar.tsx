import { NavLink } from "react-router";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  ClipboardPlus,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  Pill,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { useLayoutChrome } from "./LayoutContext";

const navigation = [
  {
    label: "Resumen",
    items: [{ to: "/", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Gestion clinica",
    items: [
      { to: "/patients", icon: Users, label: "Pacientes" },
      { to: "/appointments", icon: CalendarDays, label: "Citas medicas" },
      { to: "/triage", icon: ClipboardPlus, label: "Triaje" },
      { to: "/doctors", icon: Stethoscope, label: "Doctores" },
      { to: "/records", icon: FileText, label: "Expedientes" },
    ],
  },
  {
    label: "Operacion",
    items: [
      { to: "/laboratory", icon: FlaskConical, label: "Laboratorio" },
      { to: "/prescriptions", icon: Pill, label: "Prescripciones" },
      { to: "/billing", icon: CreditCard, label: "Cuentas y pagos" },
      { to: "/prioritization", icon: BrainCircuit, label: "Priorizacion" },
      { to: "/reports", icon: BarChart3, label: "Reportes" },
      { to: "/settings", icon: Settings, label: "Configuracion" },
    ],
  },
] as const;

export function Sidebar() {
  const {
    isSidebarCollapsed,
    isMobileSidebarOpen,
    toggleSidebar,
    closeMobileSidebar,
  } = useLayoutChrome();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isMobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeMobileSidebar}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col overflow-y-auto overflow-x-hidden bg-[#0c1a36] text-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: isSidebarCollapsed ? "88px" : "280px" }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-5">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-950/30">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Centro Medico La Aurora</p>
                <p className="truncate text-xs text-blue-200/80">Sistema clinico integral</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-blue-100 transition-colors hover:bg-white/10 lg:flex"
              aria-label={isSidebarCollapsed ? "Expandir menu lateral" : "Colapsar menu lateral"}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={closeMobileSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-blue-100 transition-colors hover:bg-white/10 lg:hidden"
              aria-label="Cerrar menu lateral"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                <Activity className="h-5 w-5" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Operacion estable</p>
                  <p className="text-xs text-blue-200/80">Flujo clinico conectado a backend</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <div className="space-y-5">
            {navigation.map((group) => (
              <div key={group.label}>
                {!isSidebarCollapsed && (
                  <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200/55">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === "/"}
                        onClick={closeMobileSidebar}
                        className={({ isActive }) =>
                          `group flex items-center rounded-xl border px-3 py-2.5 text-sm transition-all ${
                            isActive
                              ? "border-blue-400/35 bg-blue-500/18 text-white shadow-sm"
                              : "border-transparent text-blue-100/80 hover:border-white/10 hover:bg-white/10 hover:text-white"
                          } ${isSidebarCollapsed ? "justify-center" : "justify-between"}`
                        }
                        title={isSidebarCollapsed ? item.label : undefined}
                      >
                        <div className={`flex min-w-0 items-center ${isSidebarCollapsed ? "" : "gap-3"}`}>
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </div>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="mt-auto border-t border-white/10 px-4 py-4">
          <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm shadow-blue-950/25">
              LA
            </div>
            {!isSidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">Panel administrativo</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-blue-200/70">
                    <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">Control y monitoreo</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-blue-100/80 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar sesion"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
