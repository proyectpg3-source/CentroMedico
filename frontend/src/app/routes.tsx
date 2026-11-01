import { createBrowserRouter } from "react-router";
import { Root } from "./components/layout/Root";
import Login from "./pages/Login";
import Forbidden from "./pages/Forbidden";
import { RequireAuth, RequireRole } from "./auth/AuthGuards";
import { MODULE_ACCESS } from "./auth/roles";

import type { ComponentType } from "react";

// Carga diferida por pagina: cada modulo se descarga solo cuando se visita.
// Si el despliegue cambio y el archivo viejo ya no existe, se recarga una vez.
function safeSession<T>(fn: (store: Storage) => T): T | null {
  try {
    return fn(window.sessionStorage);
  } catch {
    return null;
  }
}

function page(loader: () => Promise<{ default: ComponentType }>) {
  return async () => {
    try {
      const module = await loader();
      safeSession((store) => store.removeItem("cm:chunk-reload"));
      return { Component: module.default };
    } catch (error) {
      if (!safeSession((store) => store.getItem("cm:chunk-reload"))) {
        safeSession((store) => store.setItem("cm:chunk-reload", "1"));
        window.location.reload();
        return new Promise<never>(() => {});
      }
      throw error;
    }
  };
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <p className="mb-4 text-6xl text-slate-200">404</p>
      <h2 className="mb-2 text-slate-700">Página no encontrada</h2>
      <p className="text-sm text-slate-500">La ruta que buscas no existe dentro del sistema.</p>
      <a href="/" className="mt-4 text-sm text-[#2563eb] hover:underline">
        Volver al Dashboard
      </a>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  { path: "/recuperar", lazy: () => import("./pages/PasswordRecovery").then((m) => ({ Component: m.ForgotPassword })) },
  { path: "/restablecer", lazy: () => import("./pages/PasswordRecovery").then((m) => ({ Component: m.ResetPassword })) },
  {
    Component: RequireAuth,
    children: [
      {
        path: "/",
        Component: Root,
        children: [
          { index: true, lazy: page(() => import("./pages/Dashboard")) },
          { element: <RequireRole allowed={MODULE_ACCESS["/atencion-rapida"]} />, children: [{ path: "atencion-rapida", lazy: page(() => import("./pages/QuickCare")) }] },
          { path: "forbidden", Component: Forbidden },
          { path: "account", lazy: page(() => import("./pages/Account")) },
          { element: <RequireRole allowed={MODULE_ACCESS["/patients"]} />, children: [{ path: "patients", lazy: page(() => import("./pages/Patients")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/appointments"]} />, children: [{ path: "appointments", lazy: page(() => import("./pages/Appointments")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/recepcion"]} />, children: [{ path: "recepcion", lazy: page(() => import("./pages/Recepcion")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/triage"]} />, children: [{ path: "triage", lazy: page(() => import("./pages/Triage")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/cola-espera"]} />, children: [{ path: "cola-espera", lazy: page(() => import("./pages/WaitingQueue")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/doctors"]} />, children: [{ path: "doctors", lazy: page(() => import("./pages/Doctors")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/records"]} />, children: [{ path: "consulta/:appointmentId", lazy: page(() => import("./pages/Consultation")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/laboratory"]} />, children: [{ path: "laboratory", lazy: page(() => import("./pages/Laboratory")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/inventory"]} />, children: [{ path: "inventory", lazy: page(() => import("./pages/Inventory")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/inventario-general"]} />, children: [{ path: "inventario-general", lazy: page(() => import("./pages/Inventario")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/farmacia"]} />, children: [{ path: "farmacia", lazy: page(() => import("./pages/Farmacia")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/records"]} />, children: [{ path: "records", lazy: page(() => import("./pages/MedicalRecords")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/documentos"]} />, children: [{ path: "documentos", lazy: page(() => import("./pages/Documentos")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/prescriptions"]} />, children: [{ path: "prescriptions", lazy: page(() => import("./pages/Prescriptions")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/billing"]} />, children: [{ path: "billing", lazy: page(() => import("./pages/Billing")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/facturacion"]} />, children: [{ path: "facturacion", lazy: page(() => import("./pages/Facturacion")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/reports"]} />, children: [{ path: "reports", lazy: page(() => import("./pages/Reports")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/indicadores"]} />, children: [{ path: "indicadores", lazy: page(() => import("./pages/Indicators")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/prioritization"]} />, children: [{ path: "prioritization", lazy: page(() => import("./pages/Prioritization")) }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/settings"]} />, children: [{ path: "settings", lazy: page(() => import("./pages/Settings")) }] },
          { path: "*", Component: NotFound },
        ],
      },
    ],
  },
]);
