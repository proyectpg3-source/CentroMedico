import { Navigate, Outlet, useLocation } from "react-router";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "./AuthContext";
import type { UserRole } from "./roles";

function SessionLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-950/40">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
      <p className="text-sm text-slate-400">Validando sesión segura…</p>
    </div>
  );
}

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <SessionLoader />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function RequireRole({ allowed }: { allowed: UserRole[] }) {
  const { user } = useAuth();
  if (!user || !allowed.includes(user.rol)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
