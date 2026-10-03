export type UserRole = "admin" | "medico" | "enfermero" | "fundacion" | "recepcionista";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  medico: "Médico",
  enfermero: "Enfermería",
  fundacion: "Fundación",
  recepcionista: "Recepción",
};

export const ALL_ROLES: UserRole[] = [
  "admin",
  "medico",
  "enfermero",
  "fundacion",
  "recepcionista",
];

export const MODULE_ACCESS: Record<string, UserRole[]> = {
  "/": ALL_ROLES,
  "/patients": ["admin", "medico", "enfermero", "recepcionista"],
  "/appointments": ALL_ROLES,
  "/recepcion": ["admin", "recepcionista", "enfermero"],
  "/triage": ["admin", "medico", "enfermero"],
  "/doctors": ["admin", "medico", "enfermero", "fundacion"],
  "/records": ["admin", "medico", "enfermero"],
  "/documentos": ["admin", "medico", "enfermero"],
  "/laboratory": ["admin", "medico", "enfermero", "fundacion"],
  "/inventory": ["admin", "enfermero", "fundacion"],
  "/inventario-general": ["admin", "enfermero", "fundacion"],
  "/farmacia": ["admin", "enfermero", "fundacion"],
  "/prescriptions": ["admin", "medico", "enfermero", "fundacion"],
  "/billing": ["admin", "fundacion", "recepcionista"],
  "/facturacion": ["admin", "fundacion"],
  "/prioritization": ["admin", "medico", "enfermero"],
  "/prediccion-ia": ["admin", "medico", "fundacion"],
  "/reports": ["admin", "medico", "fundacion"],
  "/settings": ["admin"],
};

export function canAccess(role: UserRole | undefined, path: string) {
  if (!role) return false;
  return (MODULE_ACCESS[path] || []).includes(role);
}
