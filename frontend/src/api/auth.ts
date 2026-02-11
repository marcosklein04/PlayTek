const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

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
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // era HTML u otra cosa
  }

  if (!res.ok) {
    const msg = data?.error || data?.detail || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export type AuthUser = {
  id: number;
  username: string;
  email?: string;
  name?: string;
  organization?: string;
  role?: "admin" | "client";
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export async function apiRegister(payload: {
  username: string;
  password: string;
  email?: string;
  name?: string;
  organization?: string;
}) {


  return http<AuthResponse>("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiLogin(username: string, password: string) {
  // usa /api/auth/login
  return http<AuthResponse>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}