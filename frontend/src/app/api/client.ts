import { getAuthToken } from "../auth/storage";

const DEFAULT_API_BASE_URL = "http://localhost:5000";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

interface ApiErrorResponse {
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const rawBody = await response.text();
  const data = rawBody ? (JSON.parse(rawBody) as T | ApiErrorResponse) : null;

  if (!response.ok) {
    const apiMessage =
      data && typeof data === "object" && "message" in data ? data.message : undefined;
    throw new Error(apiMessage || fallbackMessage);
  }

  return (data ?? null) as T;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  fallbackMessage = "No se pudo completar la solicitud."
): Promise<T> {
  try {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const token = getAuthToken();
    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && path !== "/api/auth/login") {
      window.dispatchEvent(new Event("centro-medico:unauthorized"));
    }

    return await parseResponse<T>(response, fallbackMessage);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(fallbackMessage);
  }
}

export function unwrapList<T>(response: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(response) ? response : response.data;
}
