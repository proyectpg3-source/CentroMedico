import { request } from './client';

export interface CenterSettings {
  centerName: string;
  rut: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  timezone: string;
  language: string;
}

export function fetchCenterSettings(signal?: AbortSignal) {
  return request<CenterSettings>('/api/configuracion', { signal }, 'No se pudo cargar la configuración.');
}

export function saveCenterSettings(settings: CenterSettings) {
  return request<CenterSettings>('/api/configuracion', { method: 'PUT', body: JSON.stringify(settings) }, 'No se pudo guardar la configuración.');
}
