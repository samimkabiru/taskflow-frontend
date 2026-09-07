"use client";

// ─── API Client with Auth Interceptor, Auto-Refresh & Dual Error Parsing ───────

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "/api-proxy" : "http://localhost:8080");
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

const ACCESS_TOKEN_KEY = "tf_access_token";

// In-memory access token storage backed by localStorage (survives browser exit on mobile & desktop, with sessionStorage fallback)
let inMemoryAccessToken: string | null = null;
if (typeof window !== "undefined") {
  try {
    inMemoryAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {}
}

let tokenChangeListeners: Array<(token: string | null) => void> = [];
let authFailureListeners: Array<() => void> = [];

export function getAccessToken(): string | null {
  if (!inMemoryAccessToken && typeof window !== "undefined") {
    try {
      inMemoryAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {}
  }
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        // Also sync to sessionStorage for backwards compatibility
        sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem("tf_user");
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem("tf_user");
      }
    } catch {}
  }
  tokenChangeListeners.forEach((listener) => listener(token));
}

export function onTokenChange(listener: (token: string | null) => void): () => void {
  tokenChangeListeners.push(listener);
  return () => {
    tokenChangeListeners = tokenChangeListeners.filter((l) => l !== listener);
  };
}

export function onAuthFailure(listener: () => void): () => void {
  authFailureListeners.push(listener);
  return () => {
    authFailureListeners = authFailureListeners.filter((l) => l !== listener);
  };
}

// ─── Custom API Error Class ──────────────────────────────────────────────────

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  problemDetail?: ProblemDetail;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>, problemDetail?: ProblemDetail) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.problemDetail = problemDetail;
  }
}

// Helper to parse backend error shapes (§0.5)
async function parseErrorResponse(response: Response): Promise<ApiError> {
  const status = response.status;
  let text = "";
  try {
    text = await response.text();
  } catch {
    return new ApiError(status, `HTTP Error ${status}`);
  }

  if (!text) {
    return new ApiError(status, `HTTP Error ${status}`);
  }

  try {
    const json = JSON.parse(text);

    // Shape 1: Spring ProblemDetail (has status or detail or title)
    if (json && typeof json === "object" && ("detail" in json || "title" in json || "status" in json)) {
      const detail = json.detail || json.title || `HTTP Error ${status}`;
      return new ApiError(status, detail, undefined, json as ProblemDetail);
    }

    // Shape 2: Bean validation failures (flat map of fieldName -> errorMessage)
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const fieldErrors = json as Record<string, string>;
      const firstErrorMessage = Object.values(fieldErrors)[0] || `Validation error (${status})`;
      return new ApiError(status, firstErrorMessage, fieldErrors);
    }

    return new ApiError(status, typeof json === "string" ? json : `HTTP Error ${status}`);
  } catch {
    return new ApiError(status, text || `HTTP Error ${status}`);
  }
}

// ─── Refresh Token Mutex ─────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(timeoutMs = 60000): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const executeFetch = async (timeout: number): Promise<Response> => {
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), timeout) : null;
        try {
          // POST /auth/refresh — auth endpoints bypass /api-proxy on same-origin so request path matches cookie Path=/auth scope
          const refreshUrl = API_BASE_URL.startsWith("/") ? "/auth/refresh" : `${API_BASE_URL}/auth/refresh`;
          return await fetch(refreshUrl, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            signal: controller?.signal,
          });
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      };

      let res: Response | null = null;
      try {
        res = await executeFetch(timeoutMs);
      } catch {
        // First attempt timed out or failed at network level (typically Render free tier cold-starting).
        // Try once more with a 15-second window since the initial request initiated Render's wake-up.
        try {
          res = await executeFetch(15000);
        } catch {
          // Network or timeout failed on retry as well.
          // Do NOT fire authFailureListeners or force logout on transient network failure.
          return null;
        }
      }

      if (!res) {
        return null;
      }

      // Only genuine 401 or 403 responses indicate the refresh token itself is invalid/revoked/expired.
      if (res.status === 401 || res.status === 403) {
        setAccessToken(null);
        authFailureListeners.forEach((listener) => listener());
        return null;
      }

      // Server errors (500, 502, 503, 504) are transient backend issues; do not log out
      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      const newToken = data.accessToken as string;
      setAccessToken(newToken);
      return newToken;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Core Request Wrapper ────────────────────────────────────────────────────

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  timeoutMs?: number;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isAuthEndpoint = normalizedPath.startsWith("/auth/") || path.includes("/auth/");

  // Auth endpoints (/auth/*) bypass /api-proxy on same-origin to strictly match the refresh cookie's Path=/auth scope
  let url: string;
  if (path.startsWith("http")) {
    url = path;
  } else if (isAuthEndpoint && API_BASE_URL.startsWith("/")) {
    url = normalizedPath;
  } else {
    url = `${API_BASE_URL}${normalizedPath}`;
  }

  // Build headers
  const headers = new Headers(options.headers || {});
  
  if (!options.body || !(options.body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  // Attach credentials for all /auth/* calls
  const credentials = isAuthEndpoint ? "include" : options.credentials || "same-origin";

  // Attach Bearer token if present and not explicitly skipped
  if (!options.skipAuth && inMemoryAccessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${inMemoryAccessToken}`);
  }

  let controller: AbortController | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  let effectiveSignal = options.signal;

  if (options.timeoutMs && typeof AbortController !== "undefined") {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller?.abort(), options.timeoutMs);
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller?.abort());
    }
    effectiveSignal = controller.signal;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials,
      signal: effectiveSignal,
    });
  } catch (networkError: unknown) {
    if (networkError instanceof Error && networkError.name === "AbortError") {
      throw new ApiError(0, "Request timed out. The server took too long to respond.", undefined);
    }
    throw new ApiError(0, "Network connection error. Please check your backend server.", undefined);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  // Handle 401 Unauthorized with auto-refresh (except for auth endpoints)
  if (response.status === 401 && !isAuthEndpoint && !options.skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry original request with new token
      headers.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(url, {
        ...options,
        headers,
        credentials,
      });
    } else {
      throw await parseErrorResponse(response);
    }
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ─── Typed REST Helpers ──────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: "DELETE" }),

  /**
   * Upload file via multipart/form-data
   */
  upload: <T>(path: string, formData: FormData, options?: RequestOptions): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: formData,
    }),

  /**
   * Download blob from endpoint (e.g. /attachments/{id}/download)
   */
  downloadBlob: async (path: string, defaultFilename: string = "download"): Promise<void> => {
    const url = path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = new Headers();
    if (inMemoryAccessToken) {
      headers.set("Authorization", `Bearer ${inMemoryAccessToken}`);
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    // Extract filename from Content-Disposition header if available
    let filename = defaultFilename;
    const disposition = response.headers.get("content-disposition");
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, "");
      }
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  },
};
