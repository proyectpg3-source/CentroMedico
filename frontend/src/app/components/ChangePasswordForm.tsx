import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";
import { changePassword } from "../api/auth";

export function ChangePasswordForm({ className = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" }: { className?: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (newPassword !== confirmation) {
      setMessage({ type: "error", text: "La confirmación no coincide con la nueva contraseña." });
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      setMessage({ type: "success", text: result.message });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo actualizar la contraseña." });
    } finally {
      setLoading(false);
    }
  };

  return (
        <form onSubmit={submit} className={className}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><KeyRound className="h-5 w-5" /></div>
            <div><h2 className="font-semibold text-slate-900">Cambiar contraseña</h2><p className="mt-1 text-sm text-slate-500">Usa una contraseña de al menos 8 caracteres.</p></div>
          </div>
          <div className="mt-6 space-y-4">
            <PasswordField label="Contraseña actual" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
            <PasswordField label="Nueva contraseña" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
            <PasswordField label="Confirmar nueva contraseña" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
          </div>
          {message && (
            <div role={message.type === "error" ? "alert" : "status"} className={`mt-5 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}<span>{message.text}</span>
            </div>
          )}
          <button type="submit" disabled={loading} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{loading ? "Actualizando…" : "Actualizar contraseña"}
          </button>
        </form>
  );
}

function PasswordField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span><input type="password" value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>;
}
