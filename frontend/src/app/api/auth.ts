import { request } from "./client";
import type { UserRole } from "../auth/roles";

export interface AuthUser {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: UserRole;
  id_medico: number | null;
  activo?: boolean;
}

export interface LoginResponse {
  token: string;
  usuario: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rol?: UserRole;
}

export interface UserRecord extends AuthUser {
  created_at?: string;
  updated_at?: string;
  medico_nombre?: string | null;
  medico_especialidad?: string | null;
}

export function login(credentials: LoginCredentials) {
  return request<LoginResponse>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify(credentials) },
    "No se pudo iniciar sesión."
  );
}

export function getCurrentUser() {
  return request<{ usuario: AuthUser }>(
    "/api/auth/me",
    {},
    "No se pudo validar la sesión."
  );
}

export function changePassword(passwordActual: string, passwordNuevo: string) {
  return request<{ message: string }>(
    "/api/auth/password",
    {
      method: "PUT",
      body: JSON.stringify({
        password_actual: passwordActual,
        password_nuevo: passwordNuevo,
      }),
    },
    "No se pudo actualizar la contraseña."
  );
}

export function getUsers() {
  return request<UserRecord[]>("/api/auth/usuarios", {}, "No se pudieron cargar los usuarios.");
}

export function createUser(input: {
  nombre: string;
  email: string;
  password: string;
  rol: UserRole;
  id_medico?: number | null;
}) {
  return request<UserRecord>(
    "/api/auth/usuarios",
    { method: "POST", body: JSON.stringify(input) },
    "No se pudo crear el usuario."
  );
}

export function setUserActive(id: number, activo: boolean) {
  return request<UserRecord>(
    `/api/auth/usuarios/${id}/activo`,
    { method: "PATCH", body: JSON.stringify({ activo }) },
    "No se pudo actualizar el usuario."
  );
}
