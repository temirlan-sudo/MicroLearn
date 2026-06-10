"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, User, Users, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

type Role = "student" | "teacher" | "user"
type Mode = "register" | "login"

const ROLES: { id: Role; label: string; copy: string; icon: typeof User }[] = [
  {
    id: "student",
    label: "Студент",
    copy: "Учиться у практиков. Отслеживать прогресс и собирать портфолио.",
    icon: GraduationCap,
  },
  {
    id: "teacher",
    label: "Преподаватель",
    copy: "Вести свой курс. Редакция поможет собрать программу и формат.",
    icon: Users,
  },
  {
    id: "user",
    label: "Слушатель",
    copy: "Читать журнал, пробовать бесплатные материалы и не спешить.",
    icon: User,
  },
]

const ROLE_API: Record<Role, "STUDENT" | "TEACHER" | "USER"> = {
  student: "STUDENT",
  teacher: "TEACHER",
  user: "USER",
}

function redirectFor(apiRole: "STUDENT" | "TEACHER" | "USER" | "ADMIN") {
  if (apiRole === "TEACHER") return "/teacher"
  if (apiRole === "STUDENT") return "/student"
  return "/"
}

export function RegisterForm() {
  const router = useRouter()
  const { login, register, user, loading: authLoading } = useAuth()

  const [role, setRole] = useState<Role>("student")
  const [mode, setMode] = useState<Mode>("register")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Поля регистрации
  const [name, setName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [age, setAge] = useState("")
  const [country, setCountry] = useState("")
  const [edu, setEdu] = useState("")
  const [goal, setGoal] = useState("")

  // Поля входа
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Если уже авторизован — сразу на нужный кабинет.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectFor(user.role))
    }
  }, [authLoading, user, router])

  // Синхронизация с hash — позволяет ссылке «Войти» в шапке сразу открывать режим входа
  useEffect(() => {
    const sync = () => {
      const h = typeof window !== "undefined" ? window.location.hash.replace("#", "") : ""
      if (h === "login") setMode("login")
      else if (h === "register") setMode("register")
    }
    sync()
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  const switchMode = (next: Mode) => {
    setMode(next)
    setFormError(null)
    if (typeof window !== "undefined") {
      const url = `${window.location.pathname}#${next}`
      window.history.replaceState(null, "", url)
    }
  }

  async function onSubmitRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    if (regPassword.length < 8) {
      setFormError("Пароль должен быть не короче 8 символов")
      return
    }

    setSubmitting(true)
    try {
      const parsedAge = age.trim() ? Number.parseInt(age, 10) : undefined
      const created = await register({
        name: name.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        role: ROLE_API[role],
        age: Number.isFinite(parsedAge) ? parsedAge : undefined,
        country: country.trim() || undefined,
        education: edu || undefined,
        learningGoal: goal || undefined,
      })
      router.push(redirectFor(created.role))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Не удалось создать аккаунт")
    } finally {
      setSubmitting(false)
    }
  }

  async function onSubmitLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const u = await login(loginEmail.trim().toLowerCase(), loginPassword)
      router.push(redirectFor(u.role))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Не удалось войти")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section-rule">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 py-14 md:py-20">
          {/* Левый блок — заголовок и инструкция */}
          <div className="col-span-12 md:col-span-5">
            <span className="font-display text-[11px] uppercase tracking-[0.24em] text-accent">
              {mode === "register" ? "Регистрация" : "Вход"}
            </span>
            <h1 className="mt-4 font-display text-[12vw] leading-[0.9] tracking-[-0.035em] md:text-[5.4vw]">
              {mode === "register" ? (
                <>
                  Добро
                  <br />
                  <span className="italic">пожаловать</span>
                </>
              ) : (
                <>
                  Снова
                  <br />
                  <span className="italic">с&nbsp;нами</span>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-[36ch] text-[15px] leading-[1.55] text-foreground">
              {mode === "register"
                ? "Один аккаунт — для чтения, для учёбы и для преподавания. Сменить роль можно в любой момент из настроек."
                : "Введите e-mail и пароль, чтобы продолжить с того места, где остановились."}
            </p>

            <div className="mt-10 border-t border-rule/40 pt-6 text-[12px] leading-[1.6] text-muted-foreground">
              {mode === "register" ? (
                <p>
                  {"Уже с нами? "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-foreground underline underline-offset-4 hover:text-accent"
                  >
                    Войти по e-mail
                  </button>
                  .
                </p>
              ) : (
                <p>
                  {"Ещё нет аккаунта? "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="text-foreground underline underline-offset-4 hover:text-accent"
                  >
                    Создать за минуту
                  </button>
                  .
                </p>
              )}
              <p className="mt-2">
                {"Продолжая, вы соглашаетесь с "}
                <a
                  href="/offer"
                  className="text-foreground underline underline-offset-4 hover:text-accent"
                >
                  офертой
                </a>
                {" и "}
                <a
                  href="/privacy"
                  className="text-foreground underline underline-offset-4 hover:text-accent"
                >
                  политикой конфиденциальности
                </a>
                .
              </p>
            </div>
          </div>

          {/* Правый блок — форма */}
          <div className="col-span-12 md:col-span-7">
            {/* Переключатель режимов — табы */}
            <div
              role="tablist"
              aria-label="Режим: регистрация или вход"
              className="grid grid-cols-2 border border-rule"
            >
              {[
                { id: "register" as const, label: "Регистрация" },
                { id: "login" as const, label: "Вход" },
              ].map((t) => {
                const active = mode === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchMode(t.id)}
                    className={[
                      "py-3 text-[12px] uppercase tracking-[0.2em] tnum transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "bg-background text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>

            {mode === "register" ? (
              <>
                {/* Role selector */}
                <fieldset className="mt-10">
                  <legend className="mb-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground tnum">
                    № 01 — Роль
                  </legend>
                  <div className="grid grid-cols-1 gap-px border border-rule bg-rule md:grid-cols-3">
                    {ROLES.map((r) => {
                      const active = role === r.id
                      return (
                        <label
                          key={r.id}
                          className={[
                            "relative flex cursor-pointer flex-col gap-3 p-5 transition-colors",
                            active
                              ? "bg-foreground text-background"
                              : "bg-background text-foreground hover:bg-surface",
                          ].join(" ")}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={r.id}
                            checked={active}
                            onChange={() => setRole(r.id)}
                            className="sr-only"
                          />
                          <div className="flex items-center justify-between">
                            <r.icon className="h-6 w-6" aria-hidden />
                            <span
                              className={[
                                "text-[11px] uppercase tracking-[0.22em] tnum",
                                active ? "text-background/70" : "text-muted-foreground",
                              ].join(" ")}
                            >
                              {active ? "Выбрано" : "Выбрать"}
                            </span>
                          </div>
                          <div>
                            <div className="font-display text-[22px] leading-tight tracking-[-0.01em]">
                              {r.label}
                            </div>
                            <p
                              className={[
                                "mt-1 text-[12px] leading-[1.5]",
                                active ? "text-background/80" : "text-muted-foreground",
                              ].join(" ")}
                            >
                              {r.copy}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                {/* Поля регистрации */}
                <form
                  onSubmit={onSubmitRegister}
                  className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2"
                >
                  <div className="md:col-span-2">
                    <span className="mb-3 block text-[11px] uppercase tracking-[0.22em] text-muted-foreground tnum">
                      № 02 — Данные
                    </span>
                  </div>

                  <Field
                    label="Имя и фамилия"
                    name="name"
                    placeholder="Айгерим Сарсенбаева"
                    required
                    value={name}
                    onChange={setName}
                    autoComplete="name"
                  />
                  <Field
                    label="E-mail"
                    name="email"
                    type="email"
                    placeholder="you@mail.kz"
                    required
                    value={regEmail}
                    onChange={setRegEmail}
                    autoComplete="email"
                  />
                  <Field
                    label="Пароль"
                    name="password"
                    type="password"
                    placeholder="Минимум 8 символов"
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={setRegPassword}
                    autoComplete="new-password"
                  />
                  <Field
                    label="Возраст"
                    name="age"
                    type="number"
                    placeholder="22"
                    value={age}
                    onChange={setAge}
                  />
                  <Field
                    label="Страна"
                    name="country"
                    placeholder="Казахстан"
                    value={country}
                    onChange={setCountry}
                    autoComplete="country-name"
                  />

                  <Select
                    label="Уровень образования"
                    name="edu"
                    value={edu}
                    onChange={setEdu}
                    options={[
                      "Школа",
                      "Колледж / техникум",
                      "Бакалавриат",
                      "Магистратура",
                      "PhD / Аспирантура",
                      "Другое",
                    ]}
                  />

                  <div className="md:col-span-2">
                    <Select
                      label="Цель обучения"
                      name="goal"
                      value={goal}
                      onChange={setGoal}
                      options={[
                        "Сменить профессию",
                        "Вырасти в текущей роли",
                        "Собрать портфолио",
                        "Учусь для себя",
                        "Ищу ответ на конкретную задачу",
                      ]}
                    />
                  </div>

                  {formError && (
                    <div
                      className="md:col-span-2 border border-accent/60 bg-accent/10 px-4 py-3 text-[13px] text-accent"
                      role="alert"
                    >
                      {formError}
                    </div>
                  )}

                  <div className="md:col-span-2 mt-4 flex flex-col items-start justify-between gap-4 border-t border-rule pt-6 md:flex-row md:items-center">
                    <label className="flex items-start gap-3 text-[13px] leading-[1.5] text-foreground">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="mt-1 h-4 w-4 accent-[var(--accent)]"
                      />
                      <span>Получать рассылку редакции. Можно отписаться в любой момент.</span>
                    </label>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-3 border border-foreground bg-foreground px-6 py-3 text-[13px] uppercase tracking-[0.14em] text-background transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Создаём…
                        </>
                      ) : (
                        <>
                          Создать аккаунт
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <form onSubmit={onSubmitLogin} className="mt-10 grid grid-cols-1 gap-6">
                <div>
                  <span className="mb-3 block text-[11px] uppercase tracking-[0.22em] text-muted-foreground tnum">
                    № 01 — Учётные данные
                  </span>
                </div>

                <Field
                  label="E-mail"
                  name="email"
                  type="email"
                  placeholder="you@mail.kz"
                  autoComplete="email"
                  required
                  value={loginEmail}
                  onChange={setLoginEmail}
                />
                <Field
                  label="Пароль"
                  name="password"
                  type="password"
                  placeholder="Ваш пароль"
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={setLoginPassword}
                />

                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" />
                    Запомнить устройство
                  </label>
                  <a
                    href="#recover"
                    className="text-foreground underline underline-offset-4 hover:text-accent"
                  >
                    Забыли пароль?
                  </a>
                </div>

                {formError && (
                  <div
                    className="border border-accent/60 bg-accent/10 px-4 py-3 text-[13px] text-accent"
                    role="alert"
                  >
                    {formError}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-end border-t border-rule pt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-3 border border-foreground bg-foreground px-6 py-3 text-[13px] uppercase tracking-[0.14em] text-background transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Входим…
                      </>
                    ) : (
                      <>
                        Войти
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  value,
  onChange,
  required,
  minLength,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  autoComplete?: string
  value?: string
  onChange?: (value: string) => void
  required?: boolean
  minLength?: number
}) {
  const isPassword = type === "password"
  const [show, setShow] = useState(false)
  const inputType = isPassword ? (show ? "text" : "password") : type

  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={inputType}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value ?? ""}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="h-12 w-full border border-border bg-background px-3 pr-12 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={show ? "Скрыть пароль" : "Показать пароль"}
          >
            {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        )}
      </div>
    </label>
  )
}

function Select({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string
  name: string
  options: string[]
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
      <div className="relative">
        <select
          name={name}
          value={value ?? ""}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="h-12 w-full appearance-none border border-border bg-background px-3 pr-8 text-[14px] text-foreground outline-none focus:border-foreground"
        >
          <option value="" disabled>
            Выберите из списка…
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          ↓
        </span>
      </div>
    </label>
  )
}
