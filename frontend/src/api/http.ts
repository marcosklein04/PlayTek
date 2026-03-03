const ENV_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

// En desarrollo usamos siempre rutas relativas y el proxy de Vite (/api -> backend).
// Esto evita CORS aunque VITE_API_BASE_URL tenga un valor viejo.
export const API_BASE_URL = import.meta.env.DEV ? "" : ENV_API_BASE_URL;

export function apiUrl(path: string) {
  if (path.startsWith("http")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Accept": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.detail || data.message)) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}
