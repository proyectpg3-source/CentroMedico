import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { Header } from "../components/layout/Header";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "../auth/roles";
import { ChangePasswordForm } from "../components/ChangePasswordForm";

export default function Account() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-full flex-col">
      <Header title="Mi cuenta" subtitle="Perfil y seguridad de tu sesión" />
      <div className="mx-auto grid w-full max-w-5xl gap-6 p-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white"><UserRound className="h-7 w-7" /></div>
          <h2 className="mt-5 text-xl font-semibold text-slate-900">{user?.nombre}</h2>
          <p className="mt-1 text-sm text-slate-500">{user ? ROLE_LABELS[user.rol] : "Usuario"}</p>
          <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
            <div className="flex items-center gap-3 text-slate-600"><Mail className="h-4 w-4 text-slate-400" /> {user?.email}</div>
            <div className="flex items-center gap-3 text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Cuenta activa y autenticada</div>
          </div>
        </section>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
