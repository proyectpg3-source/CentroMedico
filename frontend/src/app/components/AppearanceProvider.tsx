import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Preferences = { textSize: "normal" | "large"; reduceMotion: boolean };
const defaults: Preferences = { textSize: "normal", reduceMotion: false };
const storageKey = "centro-medico.appearance";
function readPreferences(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "null");
    return { textSize: value?.textSize === "large" ? "large" : "normal", reduceMotion: value?.reduceMotion === true };
  } catch { return defaults; }
}
const AppearanceContext = createContext<{
  preferences: Preferences;
  save: (preferences: Preferences) => void;
} | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences);
  useEffect(() => {
    document.documentElement.dataset.textSize = preferences.textSize;
    document.documentElement.dataset.reduceMotion = String(preferences.reduceMotion);
  }, [preferences]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) setPreferences(readPreferences()); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const save = (next: Preferences) => {
    // Solo confirmar si el navegador pudo persistir la preferencia.
    localStorage.setItem(storageKey, JSON.stringify(next));
    setPreferences(next);
  };
  return <AppearanceContext.Provider value={{ preferences, save }}>{children}</AppearanceContext.Provider>;
}

export function AppearanceSettings() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("AppearanceProvider no disponible");
  const { preferences, save } = context;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const update = (next: Preferences) => {
    setMessage(""); setError("");
    try { save(next); setMessage("Preferencias guardadas en este navegador."); }
    catch { setError("El navegador no pudo guardar la preferencia. Habilita el almacenamiento local e intenta de nuevo."); }
  };
  return <section className="space-y-6">
    <div><h3 className="text-foreground">Apariencia y lectura</h3><p className="mt-1 text-sm text-muted-foreground">Ajusta la lectura en este dispositivo. Los cambios se aplican a tu navegador.</p></div>
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-medium text-foreground">Tamaño del texto</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {([ ["normal", "Normal", "Tamaño habitual del sistema"], ["large", "Grande", "Texto más amplio para facilitar la lectura"] ] as const).map(([value, label, detail]) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${preferences.textSize === value ? "border-primary bg-accent" : "border-border"}`}>
          <input type="radio" name="textSize" value={value} checked={preferences.textSize === value} onChange={() => update({ ...preferences, textSize: value })} className="mt-1 accent-emerald-700" />
          <span><span className="block text-sm font-medium text-foreground">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{detail}</span></span>
        </label>)}
      </div>
    </fieldset>
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
      <input type="checkbox" checked={preferences.reduceMotion} onChange={event => update({ ...preferences, reduceMotion: event.target.checked })} className="mt-1 accent-emerald-700" />
      <span><span className="block text-sm font-medium text-foreground">Reducir movimiento</span><span className="mt-1 block text-xs text-muted-foreground">Reduce animaciones y transiciones. También se respeta la preferencia de accesibilidad del dispositivo.</span></span>
    </label>
    <button type="button" onClick={() => update(defaults)} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">Restablecer apariencia</button>
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
