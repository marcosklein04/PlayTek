const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const TOKEN_KEY = "access_token";

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    const msg = data?.error || data?.detail || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export type AdminCreditPack = {
  id: number;
  name: string;
  credits: number;
  price_ars: string;
  mp_title: string;
  mp_description: string;
  active: boolean;
};

export async function adminFetchCreditPacks() {
  return http<{ resultados: AdminCreditPack[] }>("/api/admin/credit-packs", {
    method: "GET",
    headers: { ...authHeaders() },
  });
}

export async function adminCreateCreditPack(payload: {
  name: string;
  credits: number;
  price_ars: string;
  mp_title?: string;
  mp_description?: string;
  active?: boolean;
}) {
  return http<{ ok: boolean; pack: AdminCreditPack }>(`/api/admin/credit-packs/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateCreditPack(id: number, payload: Partial<AdminCreditPack>) {
  return http<{ ok: true; pack: AdminCreditPack }>(`/api/admin/credit-packs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteCreditPack(id: number) {
  return http<{ ok: true }>(`/api/admin/credit-packs/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
}

