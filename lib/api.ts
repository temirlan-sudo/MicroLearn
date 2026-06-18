// Клиент REST API для backend. Авто-прикрепление Bearer-токена + авторефреш.
// Refresh-токен хранится в httpOnly cookie, поэтому нам достаточно credentials: "include".

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7666/api"

type TokenStore = {
  token: string | null
}

// Модуль-синглтон — чтобы избежать гонки между несколькими компонентами.
const store: TokenStore = { token: null }

const LS_KEY = "ml_access_token"

// Инициализация из localStorage (на клиенте).
if (typeof window !== "undefined") {
  try {
    store.token = window.localStorage.getItem(LS_KEY)
  } catch {
    // ignore
  }
}

export function setAccessToken(token: string | null) {
  store.token = token
  if (typeof window !== "undefined") {
    try {
      if (token) window.localStorage.setItem(LS_KEY, token)
      else window.localStorage.removeItem(LS_KEY)
    } catch {
      // ignore
    }
  }
}

export function getAccessToken() {
  return store.token
}

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  // Не парсить JSON ответ (например, для blob-скачиваний)
  raw?: boolean
  // Не пытаться рефрешить токен при 401 (используется внутри refresh-запроса)
  skipRefresh?: boolean
}

let refreshInFlight: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) return null
      const json = (await res.json()) as { data?: { accessToken?: string } }
      const token = json?.data?.accessToken ?? null
      if (token) setAccessToken(token)
      return token
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, raw, skipRefresh, headers, ...rest } = options

  const init: RequestInit = {
    ...rest,
    credentials: "include",
    headers: {
      ...(body !== undefined && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(store.token ? { Authorization: `Bearer ${store.token}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  }

  const url = path.startsWith("http")
    ? path
    : `${API_URL}${path.startsWith("/") ? path : `/${path}`}`
  let res = await fetch(url, init)

  // Авторефреш на 401 (кроме самого refresh-эндпоинта и логина).
  if (res.status === 401 && !skipRefresh && store.token) {
    const newToken = await tryRefresh()
    if (newToken) {
      init.headers = {
        ...(init.headers as Record<string, string>),
        Authorization: `Bearer ${newToken}`,
      }
      res = await fetch(url, init)
    } else {
      setAccessToken(null)
    }
  }

  if (raw) return res as unknown as T

  const text = await res.text()
  const json = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = (json && (json.error as string)) || `Request failed: ${res.status}`
    throw new ApiError(res.status, message, json?.details)
  }

  return json as T
}

export const api = {
  get: <T = unknown>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
}
