//decide que paginas pueden ser accedidas por cada rol de usuario. Esto se hace mediante un objeto llamado MODULE_ACCESS, que mapea cada ruta a un array de roles que tienen permiso para acceder a esa ruta. 
//Por ejemplo, la ruta "/patients" puede ser accedida por los roles "admin", "medico", "enfermero" y "recepcionista".


//si se añade un nuevo rol tienes que añadirlo en valid_roles.ts y en el backend en auth.service.js

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
  "/atencion-rapida": ["admin", "medico", "enfermero", "recepcionista"],
  "/patients": ["admin", "medico", "enfermero", "recepcionista"],
  "/appointments": ALL_ROLES,
  "/recepcion": ["admin", "recepcionista", "enfermero"],
  "/triage": ["admin", "medico", "enfermero"],
  "/cola-espera": ["admin", "medico", "enfermero"],
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
  "/indicadores": ["admin", "medico", "fundacion"],
  "/settings": ["admin"],
};

export function canAccess(role: UserRole | undefined, path: string) {
  if (!role) return false;
  return (MODULE_ACCESS[path] || []).includes(role);
}
