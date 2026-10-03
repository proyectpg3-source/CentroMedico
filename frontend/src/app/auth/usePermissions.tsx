import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { can, canAny, type ModuleKey, type PermissionAction } from "./permissions";

/**
 * Permisos granulares del usuario en sesion, derivados de su rol.
 *
 * Ejemplo:
 *   const { can } = usePermissions();
 *   if (can("patients", "delete")) { ... }
 */
export function usePermissions() {
  const { user } = useAuth();
  const role = user?.rol ?? null;

  return {
    role,
    can: (moduleKey: ModuleKey, action: PermissionAction) => can(role, moduleKey, action),
    canAny: (moduleKey: ModuleKey, actions: PermissionAction[]) => canAny(role, moduleKey, actions),
  };
}

interface CanProps {
  module: ModuleKey;
  action: PermissionAction;
  children: ReactNode;
  /** Se muestra en vez de `children` cuando el usuario no tiene el permiso. */
  fallback?: ReactNode;
}

/**
 * Muestra `children` solo si el usuario en sesion tiene el permiso indicado.
 *
 * Ejemplo:
 *   <Can module="patients" action="delete">
 *     <button onClick={onDelete}>Eliminar</button>
 *   </Can>
 */
export function Can({ module, action, children, fallback = null }: CanProps) {
  const { can: hasPermission } = usePermissions();
  return <>{hasPermission(module, action) ? children : fallback}</>;
}
