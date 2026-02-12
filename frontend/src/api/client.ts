import { API_BASE_URL } from "@/api/http";

function getToken() {
  // ✅ mismo key que AuthContext
  return localStorage.getItem("access_token") || localStorage.getItem("token") || "";
}

export { API_BASE_URL, getToken }

export async function apiFetch<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const headers = new Headers(opts.headers || {});
  headers.set("Accept", "application/json");

  const isFormDataBody = typeof FormData !== "undefined" && opts.body instanceof FormData;

  if (opts.body && !isFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, { ...opts, headers });

  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";

  // Error handling mejorado (si viene JSON)
  if (!res.ok) {
    if (contentType.includes("application/json")) {
      try {
        const data = JSON.parse(text);
        const msg = data?.detail || data?.error || data?.message || `HTTP ${res.status}`;
        throw new Error(msg);
      } catch {
        // cae abajo
      }
    }
    throw new Error(`HTTP ${res.status} - ${text.slice(0, 500)}`);
  }

  if (!text) return null as unknown as T;

  if (contentType.includes("application/json")) {
    return JSON.parse(text) as T;
  }

  return text as unknown as T;
}
