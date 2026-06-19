import { createBrowserRouter } from "react-router";
import { Root } from "./components/layout/Root";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Appointments from "./pages/Appointments";
import Doctors from "./pages/Doctors";
import Laboratory from "./pages/Laboratory";
import MedicalRecords from "./pages/MedicalRecords";
import Prescriptions from "./pages/Prescriptions";
import Billing from "./pages/Billing";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Prioritization from "./pages/Prioritization";
import Triage from "./pages/Triage";

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
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "patients", Component: Patients },
      { path: "appointments", Component: Appointments },
      { path: "triage", Component: Triage },
      { path: "doctors", Component: Doctors },
      { path: "laboratory", Component: Laboratory },
      { path: "records", Component: MedicalRecords },
      { path: "prescriptions", Component: Prescriptions },
      { path: "billing", Component: Billing },
      { path: "reports", Component: Reports },
      { path: "prioritization", Component: Prioritization },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);
