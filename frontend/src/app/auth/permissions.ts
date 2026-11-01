import type { UserRole } from "./roles";

/**
 * Acciones granulares dentro de un modulo. "view" ya esta controlado a nivel de
 * ruta por MODULE_ACCESS/RequireRole (roles.ts, AuthGuards.tsx) - se repite aqui
 * solo para poder ocultar contenido puntual dentro de una pagina si hiciera falta.
 */
export type PermissionAction = "view" | "create" | "edit" | "delete";

export type ModuleKey =
  | "patients"
  | "appointments"
  | "triage"
  | "doctors"
  | "laboratory"
  | "inventory"
  | "records"
  | "prescriptions"
  | "billing"
  | "prioritization"
  | "reports"
  | "settings";

type ModulePermissions = Partial<Record<PermissionAction, boolean>>;
type RolePermissions = Record<ModuleKey, ModulePermissions>;

const ALL: ModulePermissions = { view: true, create: true, edit: true, delete: true };
const NONE: ModulePermissions = {};
const VIEW: ModulePermissions = { view: true };
const VIEW_EDIT: ModulePermissions = { view: true, edit: true };
const VIEW_CREATE_EDIT: ModulePermissions = { view: true, create: true, edit: true };

// Los botones reflejan las operaciones existentes en el backend; cada API
// comprueba sus permisos de forma independiente. No se permite borrar datos clínicos.
export const PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    patients: ALL,
    appointments: ALL,
    triage: ALL,
    doctors: ALL,
    laboratory: ALL,
    inventory: ALL,
    records: ALL,
    prescriptions: ALL,
    billing: ALL,
    prioritization: ALL,
    reports: ALL,
    settings: ALL,
  },
  recepcionista: {
    // Registra pacientes y agenda citas; no maneja historia clinica ni datos clinicos.
    // (coincide con MODULE_ACCESS en roles.ts: no entra a /doctors, /triage, etc.)
    patients: VIEW_CREATE_EDIT,
    appointments: VIEW_CREATE_EDIT,
    triage: NONE,
    doctors: NONE,
    laboratory: NONE,
    inventory: NONE,
    records: NONE,
    prescriptions: NONE,
    billing: VIEW_CREATE_EDIT,
    prioritization: NONE,
    reports: NONE,
    settings: NONE,
  },
  enfermero: {
    // Registra pacientes, llegadas y evaluaciones. Consulta expedientes;
    // la validación de prioridad y la consulta médica corresponden al médico.
    patients: VIEW_CREATE_EDIT,
    appointments: VIEW_CREATE_EDIT,
    triage: VIEW_CREATE_EDIT,
    doctors: VIEW,
    laboratory: VIEW_EDIT,
    inventory: VIEW_EDIT,
    records: VIEW,
    prescriptions: VIEW,
    billing: NONE,
    prioritization: VIEW,
    reports: NONE,
    settings: NONE,
  },
  medico: {
    // Crea/edita historias y recetas; consulta pacientes y agenda; sin
    // acceso administrativo ni de inventario.
    patients: VIEW,
    appointments: VIEW,
    triage: VIEW,
    doctors: VIEW,
    laboratory: VIEW_CREATE_EDIT,
    inventory: NONE,
    records: VIEW_CREATE_EDIT,
    prescriptions: VIEW_CREATE_EDIT,
    billing: NONE,
    prioritization: VIEW_EDIT,
    reports: VIEW,
    settings: NONE,
  },
  fundacion: {
    // Vista institucional/financiera: facturacion y reportes completos, el
    // resto en solo lectura y sin acceso a datos clinicos de pacientes.
    patients: NONE,
    appointments: VIEW,
    triage: NONE,
    doctors: VIEW,
    laboratory: VIEW,
    inventory: VIEW,
    records: NONE,
    prescriptions: VIEW,
    billing: ALL,
    prioritization: NONE,
    reports: ALL,
    settings: NONE,
  },
};

export function can(
  role: UserRole | null | undefined,
  moduleKey: ModuleKey,
  action: PermissionAction
): boolean {
  if (!role) return false;
  return Boolean(PERMISSIONS[role]?.[moduleKey]?.[action]);
}

export function canAny(
  role: UserRole | null | undefined,
  moduleKey: ModuleKey,
  actions: PermissionAction[]
): boolean {
  return actions.some((action) => can(role, moduleKey, action));
}
