const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function requestHeaders(init?: RequestInit): HeadersInit {
  return init?.body instanceof FormData ? { ...init?.headers } : { "Content-Type": "application/json", ...init?.headers };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: requestHeaders(init) });
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
 * Downloads a file and saves it via the browser's save flow using a throwaway object URL.
 * The filename falls back to a default when the server didn't send a Content-Disposition
 * (shouldn't happen for export endpoints).
 */
export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const response = await fetch(`${API_URL}${path}`);
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
