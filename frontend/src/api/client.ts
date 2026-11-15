const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const TOKEN_STORAGE_KEY = "vb_token";

let authToken: string | null = null;
try {
  authToken = localStorage.getItem(TOKEN_STORAGE_KEY);
} catch {
  authToken = null;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setAuthToken(token: string | null): void {
  authToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Private-mode/blocked storage — the in-memory token still works for this tab.
  }
}

function authHeaders(init?: RequestInit): HeadersInit {
  const base = init?.body instanceof FormData ? { ...init?.headers } : { "Content-Type": "application/json", ...init?.headers };
  return authToken ? { ...base, Authorization: `Bearer ${authToken}` } : base;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: authHeaders(init) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? `Request to ${path} failed with ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  fileUrl: (path: string) => `${API_URL}${path}`,
};

/**
 * Downloads a protected endpoint and saves it as a file. A plain `<a href>` can't carry an
 * Authorization header, so this fetches the bytes with the current token, then triggers the
 * browser's save flow via a throwaway object URL. The filename falls back to a default when
 * the server didn't send a Content-Disposition (shouldn't happen for export endpoints).
 */
export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? `Download failed with ${response.status}`);
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? fallbackFilename;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
