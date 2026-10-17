import { useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";

function SessionLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-6">
      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <LoaderCircle className="h-5 w-5 animate-spin text-sidebar-foreground/60" />
        <span className="text-sm font-medium text-sidebar-foreground/80">
          Validando sesión...
        </span>
      </div>
    </div>
  );
}

/**
 * Traduce mensajes de error tecnicos (del backend o de la red) a mensajes
 * mas humanos y accionables para quien esta iniciando sesion.
 */
function humanizeLoginError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes("failed to fetch") || message.includes("network")) {
    return "No pudimos conectar con el servidor. Revisá tu conexión a internet e intentá de nuevo.";
  }

  if (
    message.includes("credencial") ||
    message.includes("invalid") ||
    message.includes("incorrect") ||
    message.includes("401")
  ) {
    return "El correo o la contraseña no son correctos. Verificalos e intentá de nuevo.";
  }

  if (message.includes("inactiv") || message.includes("desactiv")) {
    return "Tu cuenta está desactivada. Contactá a un administrador del sistema.";
  }

  if (message.includes("timeout")) {
    return "El servidor tardó demasiado en responder. Intentá de nuevo en unos segundos.";
  }

  if (!rawMessage) {
    return "No se pudo iniciar sesión. Intentá de nuevo.";
  }

  return rawMessage;
}

export default function Login() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      const from = (location.state as { from?: string } | null)?.from || "/";
      navigate(from, { replace: true });
    }
  }, [location.state, navigate, status]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      // El rol lo determina el backend a partir de la cuenta del usuario;
      // no se pide como parte del inicio de sesion.
      await login({ email, password });
      const from = (location.state as { from?: string } | null)?.from || "/";
      navigate(from, { replace: true });
    } catch (submitError) {
      const rawMessage =
        submitError instanceof Error ? submitError.message : "";
      setError(humanizeLoginError(rawMessage));
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <SessionLoader />;
  }

  const inputClasses =
    "h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 text-[15px] text-sidebar-foreground placeholder:text-sidebar-foreground/40 outline-none transition-colors focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50";

  return (
    <main className="clinic-login-centered relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-sidebar px-4 py-10">
      {/* Fondo: degradado institucional + halos de color, sin depender de una foto externa */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(5,150,105,0.18),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(5,150,105,0.12),transparent_50%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/2 -translate-y-1/2 opacity-[0.06]"
      >
        <div className="relative h-[420px] w-[420px]">
          <Plus
            className="absolute inset-0 h-full w-full text-white"
            strokeWidth={1}
          />
        </div>
      </div>

      {/* Tarjeta de acceso */}
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Activity size={26} aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-sidebar-foreground">
            Centro Médico La Aurora
          </h1>
          <p className="mt-1 text-sm text-sidebar-foreground/50">
            Acceso al sistema
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="login-email"
              className="text-xs font-normal text-sidebar-foreground/60"
            >
              Correo electrónico
            </Label>
            <div className="relative">
              <Mail
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/40"
              />
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                disabled={loading}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="nombre@ejemplo.com"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="login-password"
              className="text-xs font-normal text-sidebar-foreground/60"
            >
              Contraseña
            </Label>
            <div className="relative">
              <Lock
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/40"
              />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={loading}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                className={`${inputClasses} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={loading}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full gap-2 text-[15px]"
          >
            {loading ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <UserRound size={18} />
            )}
            {loading ? "Validando acceso..." : "Ingresar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-sidebar-foreground/40">
          ¿Problemas para ingresar? Contactá al administrador del sistema.
        </p>
      </div>
    </main>
  );
}
