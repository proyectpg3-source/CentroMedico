import { useEffect, useRef } from "react";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardPlus,
  CreditCard,
  FileText,
  FlaskConical,
  FolderOpen,
  HeartPulse,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Package,
  PanelLeftClose,
  Pill,
  ReceiptText,
  Settings,
  ShieldCheck,
  TrendingDown,
  Stethoscope,
  Syringe,
  Users,
} from "lucide-react";
import { NavLink } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { canAccess, ROLE_LABELS } from "../../auth/roles";
import { useLayoutChrome } from "./LayoutContext";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: "Resumen",
    items: [{ to: "/", icon: LayoutDashboard, label: "Vista general" }],
  },
  {
    label: "Atención clínica",
    items: [
      { to: "/atencion-rapida", icon: HeartPulse, label: "Atención rápida" },
      { to: "/patients", icon: Users, label: "Pacientes" },
      { to: "/appointments", icon: CalendarDays, label: "Citas médicas" },
      // Flujo clínico: Recepción → Enfermería → Validación → Cola → Consulta
      { to: "/recepcion", icon: ClipboardCheck, label: "Recepción" },
      { to: "/triage", icon: ClipboardPlus, label: "Evaluación de Enfermería" },
      { to: "/prioritization", icon: ShieldCheck, label: "Validación profesional" },
      { to: "/cola-espera", icon: ListOrdered, label: "Cola médica" },
      { to: "/doctors", icon: Stethoscope, label: "Doctores" },
      { to: "/records", icon: FileText, label: "Expedientes" },
      { to: "/documentos", icon: FolderOpen, label: "Documentos" },
    ],
  },
  {
    label: "Operación",
    items: [
      { to: "/laboratory", icon: FlaskConical, label: "Laboratorio" },
      { to: "/inventory", icon: Package, label: "Insumos de laboratorio" },
      { to: "/inventario-general", icon: Boxes, label: "Inventario general" },
      { to: "/farmacia", icon: Syringe, label: "Farmacia" },
      { to: "/prescriptions", icon: Pill, label: "Prescripciones" },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { to: "/billing", icon: CreditCard, label: "Cuentas y pagos" },
      { to: "/facturacion", icon: ReceiptText, label: "Facturación SAT" },
    ],
  },
  {
    label: "Administración",
    items: [
      { to: "/reports", icon: BarChart3, label: "Reportes" },
      { to: "/indicadores", icon: TrendingDown, label: "Indicadores" },
      { to: "/settings", icon: Settings, label: "Configuración" },
    ],
  },
];

export function Sidebar() {
  const {
    isSidebarCollapsed: desktopCollapsed,
    isMobileSidebarOpen,
    toggleSidebar,
    closeMobileSidebar,
  } = useLayoutChrome();
  const { user, logout } = useAuth();
  const isSidebarCollapsed = desktopCollapsed && !isMobileSidebarOpen;
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const sidebar = sidebarRef.current;
    const focusable = () => Array.from(sidebar?.querySelectorAll<HTMLElement>('a[href], button') ?? [])
      .filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileSidebar();
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [isMobileSidebarOpen, closeMobileSidebar]);

  const initials = (user?.nombre || "Usuario")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Backdrop para navegacion movil */}
      <div
        className={`fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isMobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeMobileSidebar}
      />

      <aside
        ref={sidebarRef}
        role={isMobileSidebarOpen ? "dialog" : undefined}
        aria-modal={isMobileSidebarOpen ? true : undefined}
        aria-label="Navegación principal"
        data-mobile-open={isMobileSidebarOpen}
        data-collapsed={isSidebarCollapsed}
        className={`clinic-sidebar fixed inset-y-0 left-0 z-40 flex h-screen flex-col overflow-y-auto overflow-x-hidden bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: isSidebarCollapsed ? "88px" : "280px" }}
      >
        {/* Header con Marca */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-5">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-sidebar-primary">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">La Aurora</p>
                <p className="truncate text-xs text-sidebar-foreground/70">Centro médico</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden h-9 w-9 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent lg:flex"
              aria-label={isSidebarCollapsed ? "Expandir menu lateral" : "Colapsar menu lateral"}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={closeMobileSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent lg:hidden"
              aria-label="Cerrar menu lateral"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Menu de Navegacion */}
        <nav className="flex-1 px-3 py-4">
          <div className="space-y-5">
            {navigation.map((group) => {
              const accessibleItems = group.items.filter((item) => canAccess(user?.rol, item.to));
              if (accessibleItems.length === 0) return null;

              return (
                <div key={group.label}>
                  {!isSidebarCollapsed && (
                    <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">
                      {group.label}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {accessibleItems.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          aria-label={item.label}
                          end={item.to === "/"}
                          onClick={closeMobileSidebar}
                          className={({ isActive }) =>
                            `group flex items-center rounded-md border px-3 py-2.5 text-sm transition-all ${
                              isActive
                                ? "border-sidebar-primary/40 bg-sidebar-primary/20 text-white shadow-sm"
                                : "border-transparent text-sidebar-foreground/75 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-white"
                            } ${isSidebarCollapsed ? "justify-center" : "justify-between"}`
                          }
                          title={isSidebarCollapsed ? item.label : undefined}
                        >
                          <div className={`flex min-w-0 flex-1 items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                          </div>
                          {!isSidebarCollapsed && item.badge && (
                            <span
                              className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${
                                item.badgeColor || "bg-sidebar-primary"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Seccion de Usuario / Logout accesible en ambos modos */}
        <div className="mt-auto border-t border-sidebar-border px-4 py-4">
          <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={logout}
                className="group relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground shadow-sm transition-transform hover:scale-105"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.nombre} className="h-full w-full rounded-full object-cover" />
                ) : (
                  initials
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
                  <LogOut className="h-4 w-4 text-white" />
                </div>
              </button>
            ) : (
              <>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground shadow-sm shadow-black/25 overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user?.nombre} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{user?.nombre}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-sidebar-foreground/70">
                    <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{user ? ROLE_LABELS[user.rol] : "Sesión activa"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-white"
                  aria-label="Cerrar sesion"
                  title="Cerrar sesión"
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
