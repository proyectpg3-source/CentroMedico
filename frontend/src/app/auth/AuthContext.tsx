import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "../api/auth";
import type { AuthUser, LoginCredentials } from "../api/auth";
import { clearAuthToken, getAuthToken, setAuthToken } from "./storage";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = getAuthToken();
    if (!token) {
      setStatus("anonymous");
      return;
    }

    authApi.getCurrentUser()
      .then(({ usuario }) => {
        if (cancelled) return;
        setUser(usuario);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!cancelled) logout();
      });

    return () => {
      cancelled = true;
    };
  }, [logout]);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("centro-medico:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("centro-medico:unauthorized", handleUnauthorized);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    login: async (credentials) => {
      const result = await authApi.login({
        ...credentials,
        email: credentials.email.trim().toLowerCase(),
      });
      setAuthToken(result.token);
      setUser(result.usuario);
      setStatus("authenticated");
      return result.usuario;
    },
    logout,
  }), [logout, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return context;
}
