import { ArrowUpRight, CalendarDays, Menu, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { canAccess, ROLE_LABELS } from "../../auth/roles";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../ui/dialog";
import { navigation } from "./Sidebar";
import { useLayoutChrome } from "./LayoutContext";

interface HeaderProps { title: string; subtitle?: string; status?: string }

export function Header({ title, subtitle, status }: HeaderProps) {
  const { openMobileSidebar } = useLayoutChrome();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeGroup = navigation.find((group) => group.items.some((item) => item.to === location.pathname));
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const results = navigation.flatMap((group) => group.items)
    .filter((item) => canAccess(user?.rol, item.to) && normalize(item.label).includes(normalize(searchValue.trim())));
  const today = new Date().toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });

  function changeOpen(open: boolean) { setSearchOpen(open); if (!open) setSearchValue(""); }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="clinic-header">
      <div className="clinic-header-heading">
        <button type="button" onClick={openMobileSidebar} className="clinic-icon-button lg:hidden" aria-label="Abrir menú lateral"><Menu size={20} /></button>
        <div className="min-w-0">
          <nav className="clinic-header-context" aria-label="Ubicación actual">
            <Link to="/">La Aurora</Link><span aria-hidden="true">/</span><span>{activeGroup?.label || "Mi cuenta"}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <h1>{title}</h1>
            {status && <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs">{status}</span>}
          </div>
          {subtitle && <p className="clinic-header-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="clinic-header-actions">
        <span className="clinic-header-date"><CalendarDays size={15} aria-hidden="true" />{today}</span>
        <Dialog open={searchOpen} onOpenChange={changeOpen}>
          <DialogTrigger asChild>
            <button type="button" className="clinic-module-search"><Search size={17} /><span>Buscar módulo</span><kbd>Ctrl K</kbd></button>
          </DialogTrigger>
          <DialogContent className="bg-card sm:max-w-lg">
            <DialogTitle>Ir a un módulo</DialogTitle>
            <DialogDescription>Encuentra las áreas disponibles para tu cuenta.</DialogDescription>
            <label className="sr-only" htmlFor="module-search">Buscar módulo</label>
            <input id="module-search" placeholder="Pacientes, citas, laboratorio…" value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && results[0]) { event.preventDefault(); navigate(results[0].to); changeOpen(false); } }}
              className="h-12 rounded-lg border border-border bg-input-background px-4 text-foreground" />
            <nav aria-label="Resultados de módulos" className="max-h-[min(50vh,360px)] overflow-y-auto">
              {results.map((item) => <Link key={item.to} to={item.to} onClick={() => changeOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-foreground hover:bg-accent">
                <item.icon className="h-4 w-4 text-primary" /><span className="flex-1">{item.label}</span><ArrowUpRight size={15} className="text-muted-foreground" />
              </Link>)}
              {results.length === 0 && <p role="status" className="py-6 text-center text-sm text-muted-foreground">No hay módulos con ese nombre. Prueba otra palabra.</p>}
            </nav>
          </DialogContent>
        </Dialog>
        <Link to="/account" className="clinic-profile-link" aria-label="Mi cuenta">
          <span className="clinic-profile-avatar"><UserRound size={19} /></span>
          <span className="hidden 2xl:block"><strong>{user?.nombre || "Usuario"}</strong><small>{user ? ROLE_LABELS[user.rol] : "Mi cuenta"}</small></span>
        </Link>
      </div>
    </header>
  );
}
