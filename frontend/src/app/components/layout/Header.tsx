import { Bell, CalendarDays, Command, Menu, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { ROLE_LABELS } from "../../auth/roles";
import { useLayoutChrome } from "./LayoutContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  status?: string;
}

export function Header({ title, subtitle, status }: HeaderProps) {
  const { openMobileSidebar } = useLayoutChrome();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const today = new Date().toLocaleDateString("es-GT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userName = user?.nombre || user?.name || "Usuario";
  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  // Atajo global Ctrl+K / Cmd+K y tecla Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && searchOpen) {
        closeSearch();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    setSearchValue("");
  }

  function handleQuickNavigate(href: string) {
    closeSearch();
    navigate(href);
  }

  return (
    <>
      {/* Modal Omnibox Flotante (Ctrl+K) */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-background/80 backdrop-blur-sm p-4"
          onClick={closeSearch}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar paciente, cita, doctor, expediente..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none bg-transparent"
                autoComplete="off"
              />
              <button 
                type="button" 
                onClick={closeSearch} 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {searchValue.length === 0 ? (
              <div className="p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Accesos rápidos
                </p>
                {[
                  { label: "Nuevo paciente", href: "/patients" },
                  { label: "Nueva cita", href: "/appointments" },
                  { label: "Ver emergencias", href: "/emergencias" },
                  { label: "Ir a laboratorio", href: "/laboratory" },
                  { label: "Facturación SAT", href: "/facturacion" },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleQuickNavigate(item.href)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left hover:bg-accent hover:text-accent-foreground text-sm text-muted-foreground transition-colors"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4">
                <p className="text-xs text-muted-foreground">
                  Buscando "<span className="text-foreground font-medium">{searchValue}</span>"…
                </p>
              </div>
            )}

            <div className="px-4 py-2 border-t border-border bg-muted/50 flex items-center gap-4">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono">Esc</kbd> cerrar
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono">↵</kbd> ir
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background px-4 py-3.5 lg:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          
          {/* Lado Izquierdo: Menú Móvil + Título + Status + Subtítulo */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={openMobileSidebar}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent lg:hidden"
              aria-label="Abrir menú lateral"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                
                {/* Mostrar solo estados proporcionados por la pantalla. */}
                {status && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase ${
                    status === "OPERATIVO"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {status === "OPERATIVO" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  {status}
                </span>
                )}
              </div>

              {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}

              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 capitalize">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {today}
                </span>
                <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
                <span className="hidden sm:inline">Centro Médico La Aurora</span>
              </div>
            </div>
          </div>

          {/* Lado Derecho: Buscador omnibox + Acciones rápidas + Perfil */}
          <div className="flex items-center gap-2.5 justify-between xl:justify-end">
            
            {/* Botón / Disparador de Omnibox */}
            <button
              type="button"
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchRef.current?.focus(), 50);
              }}
              className="flex-1 sm:flex-initial flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-input-background border border-border rounded-md hover:border-primary/50 transition-all group w-full sm:w-64"
            >
              <Search className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left text-xs sm:text-sm">Buscar...</span>
              <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-mono bg-card border border-border rounded px-1.5 py-0.5 group-hover:border-primary/40 flex-shrink-0">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            {/* Nueva Cita SPA */}
            <Link
              to="/appointments"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva cita</span>
            </Link>

            {/* Notificaciones */}
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent flex-shrink-0"
              aria-label="Notificaciones"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive" />
            </button>

            {/* Perfil de Usuario */}
            <Link
              to="/account"
              className="hidden md:flex items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-1.5 transition-colors hover:bg-accent flex-shrink-0"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </div>
              <div className="text-left">
                <p className="max-w-28 truncate text-xs font-medium leading-tight text-foreground">{userName}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {user?.rol || user?.role ? ROLE_LABELS[user.rol || user.role] : "Usuario"}
                </p>
              </div>
            </Link>

          </div>
        </div>
      </header>
    </>
  );
}