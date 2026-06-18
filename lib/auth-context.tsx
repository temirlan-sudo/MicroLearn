"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { api, ApiError, setAccessToken, getAccessToken } from "@/lib/api"

export type AuthUser = {
  id: string
  name: string
  email: string
  role: "USER" | "STUDENT" | "TEACHER" | "ADMIN"
  plan: "FREE" | "PRO" | "PREMIUM"
  avatarUrl?: string | null
  age?: number | null
  country?: string | null
  education?: string | null
  learningGoal?: string | null
  bio?: string | null
  createdAt: string
}

export type RegisterPayload = {
  name: string
  email: string
  password: string
  role?: AuthUser["role"]
  age?: number
  country?: string
  education?: string
  learningGoal?: string
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get<{ data: AuthUser }>("/auth/me")
      setUser(res.data)
    } catch (err) {
      // Если нет токена / 401 — просто отсутствует сессия.
      if (err instanceof ApiError && err.status === 401) {
        setUser(null)
        setAccessToken(null)
      }
    }
  }, [])

  // Инициализация: если токен уже есть в localStorage — подтянем профиль.
  // Без локального access token не делаем гостевой refresh-запрос, чтобы публичные страницы не шумели 401.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (getAccessToken()) {
          await fetchMe()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchMe])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const res = await api.post<{ data: { accessToken: string; user: AuthUser } }>(
        "/auth/login",
        { email, password },
        { skipRefresh: true },
      )
      setAccessToken(res.data.accessToken)
      setUser(res.data.user)
      return res.data.user
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка входа"
      setError(msg)
      throw err
    }
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    setError(null)
    try {
      const res = await api.post<{ data: { accessToken: string; user: AuthUser } }>(
        "/auth/register",
        payload,
        { skipRefresh: true },
      )
      setAccessToken(res.data.accessToken)
      setUser(res.data.user)
      return res.data.user
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка регистрации"
      setError(msg)
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout")
    } catch {
      // ignore
    }
    setAccessToken(null)
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    await fetchMe()
  }, [fetchMe])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
