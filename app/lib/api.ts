const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TOKEN_KEY = "auth-token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string>) };
  if (token) headers.Authorization = "Bearer " + token;

  const res = await fetch(API_URL + path, { ...options, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(body?.error || `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

export type Role = "viewer" | "editor";
export type AuthUser = { id: string; email: string; name: string; role: Role };

export const authApi = {
  signup: (input: { email: string; password: string; name?: string; role: Role }) =>
    request<{ token: string; user: AuthUser }>("/api/auth/signup", { method: "POST", body: JSON.stringify(input) }),
  login: (input: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/api/auth/login", { method: "POST", body: JSON.stringify(input) }),
  me: () => request<{ user: AuthUser }>("/api/auth/me"),
};

export const ledgerApi = {
  get: (search?: string, logSearch?: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (logSearch) params.set("logSearch", logSearch);
    const qs = params.toString();
    return request<{ items: unknown[]; locations: unknown[]; txLog: unknown[] }>(`/api/ledger${qs ? `?${qs}` : ""}`);
  },
  undo: () => request<{ ok: true }>("/api/ledger/undo", { method: "POST" }),
  stockIn: (form: unknown) => request<{ item: unknown }>("/api/ledger/in", { method: "POST", body: JSON.stringify(form) }),
  produce: (form: unknown) => request<{ item: unknown }>("/api/ledger/produce", { method: "POST", body: JSON.stringify(form) }),
  stockOut: (id: string, qty: number) =>
    request<{ item: unknown }>(`/api/ledger/items/${id}/out`, { method: "POST", body: JSON.stringify({ qty }) }),
  transfer: (id: string, form: unknown) =>
    request<{ ok: true }>(`/api/ledger/items/${id}/transfer`, { method: "POST", body: JSON.stringify(form) }),
  edit: (id: string, form: unknown) =>
    request<{ item: unknown }>(`/api/ledger/items/${id}`, { method: "PUT", body: JSON.stringify(form) }),
  remove: (id: string) => request<{ ok: true }>(`/api/ledger/items/${id}`, { method: "DELETE" }),
  reserve: (id: string, types: string[], qty: number) =>
    request<{ item: unknown }>(`/api/ledger/items/${id}/reserve`, { method: "POST", body: JSON.stringify({ types, qty }) }),
  unreserve: (id: string) => request<{ item: unknown }>(`/api/ledger/items/${id}/unreserve`, { method: "POST" }),
};
