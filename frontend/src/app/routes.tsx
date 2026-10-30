import { createBrowserRouter } from "react-router";
import { Root } from "./components/layout/Root";
import Dashboard from "./pages/Dashboard";
import QuickCare from "./pages/QuickCare";
import Patients from "./pages/Patients";
import Appointments from "./pages/Appointments";
import Doctors from "./pages/Doctors";
import Laboratory from "./pages/Laboratory";
import Inventory from "./pages/Inventory";
import MedicalRecords from "./pages/MedicalRecords";
import Prescriptions from "./pages/Prescriptions";
import Billing from "./pages/Billing";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Prioritization from "./pages/Prioritization";
import Triage from "./pages/Triage";
import WaitingQueue from "./pages/WaitingQueue";
import Consultation from "./pages/Consultation";
import Login from "./pages/Login";
import Forbidden from "./pages/Forbidden";
import Account from "./pages/Account";
import Recepcion from "./pages/Recepcion";
import Documentos from "./pages/Documentos";
import Farmacia from "./pages/Farmacia";
import Inventario from "./pages/Inventario";
import Facturacion from "./pages/Facturacion";
import { RequireAuth, RequireRole } from "./auth/AuthGuards";
import { MODULE_ACCESS } from "./auth/roles";

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
  {
    Component: RequireAuth,
    children: [
      {
        path: "/",
        Component: Root,
        children: [
          { index: true, Component: Dashboard },
          { element: <RequireRole allowed={MODULE_ACCESS["/atencion-rapida"]} />, children: [{ path: "atencion-rapida", Component: QuickCare }] },
          { path: "forbidden", Component: Forbidden },
          { path: "account", Component: Account },
          { element: <RequireRole allowed={MODULE_ACCESS["/patients"]} />, children: [{ path: "patients", Component: Patients }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/appointments"]} />, children: [{ path: "appointments", Component: Appointments }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/recepcion"]} />, children: [{ path: "recepcion", Component: Recepcion }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/triage"]} />, children: [{ path: "triage", Component: Triage }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/triage"]} />, children: [{ path: "cola-espera", Component: WaitingQueue }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/doctors"]} />, children: [{ path: "doctors", Component: Doctors }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/records"]} />, children: [{ path: "consulta/:appointmentId", Component: Consultation }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/laboratory"]} />, children: [{ path: "laboratory", Component: Laboratory }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/inventory"]} />, children: [{ path: "inventory", Component: Inventory }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/inventario-general"]} />, children: [{ path: "inventario-general", Component: Inventario }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/farmacia"]} />, children: [{ path: "farmacia", Component: Farmacia }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/records"]} />, children: [{ path: "records", Component: MedicalRecords }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/documentos"]} />, children: [{ path: "documentos", Component: Documentos }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/prescriptions"]} />, children: [{ path: "prescriptions", Component: Prescriptions }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/billing"]} />, children: [{ path: "billing", Component: Billing }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/facturacion"]} />, children: [{ path: "facturacion", Component: Facturacion }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/reports"]} />, children: [{ path: "reports", Component: Reports }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/prioritization"]} />, children: [{ path: "prioritization", Component: Prioritization }] },
          { element: <RequireRole allowed={MODULE_ACCESS["/settings"]} />, children: [{ path: "settings", Component: Settings }] },
          { path: "*", Component: NotFound },
        ],
      },
    ],
  },
]);
