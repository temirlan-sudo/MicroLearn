"use client"

import {
  useMyCertificates,
  useMyEnrollments,
  useMyFavorites,
  useStudentDashboard,
} from "@/lib/hooks"

type Achievement = {
  code: string
  title: string
  detail: string
  earned: boolean
  progress: number
  target: number
  date?: string
}

function pct(value: number, target: number) {
  if (target <= 0) return 100
  return Math.min(100, Math.round((value / target) * 100))
}

/**
 * Достижения выводятся из фактов: серия, сертификаты, завершённые курсы, кол-во уроков.
 */
export function StudentAchievements() {
  const { data: dash } = useStudentDashboard()
  const { data: certs } = useMyCertificates()
  const { data: enrollments } = useMyEnrollments()
  const { data: favorites } = useMyFavorites()

  const completedCourses = dash?.coursesCompleted ?? 0
  const completedLessons = dash?.totalLessonsCompleted ?? 0
  const streak = dash?.currentStreak ?? 0
  const certificates = certs ?? []
  const saved = favorites?.length ?? 0
  const activeCourses =
    enrollments?.filter((item) => item.progressPercent > 0 && item.progressPercent < 100).length ??
    0
  const firstCertificate = [...certificates].sort(
    (a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime(),
  )[0]
  const firstActivity = dash?.recentActivity[dash.recentActivity.length - 1]
  const lastActivity = dash?.recentActivity[0]

  const achievements: Achievement[] = [
    {
      code: "A-01",
      title: "Первый урок",
      detail: firstActivity
        ? `Старт с урока «${firstActivity.lessonTitle}».`
        : "Завершите любой урок, чтобы открыть первую отметку.",
      earned: completedLessons >= 1,
      progress: completedLessons,
      target: 1,
      date: firstActivity
        ? new Date(firstActivity.completedAt).toLocaleDateString("ru-RU")
        : undefined,
    },
    {
      code: "A-02",
      title: "Десять уроков",
      detail: `Завершено ${completedLessons} из 10 уроков. Это показывает устойчивый учебный темп.`,
      earned: completedLessons >= 10,
      progress: completedLessons,
      target: 10,
      date:
        completedLessons >= 10 && lastActivity
          ? new Date(lastActivity.completedAt).toLocaleDateString("ru-RU")
          : undefined,
    },
    {
      code: "A-03",
      title: "Прилежный читатель",
      detail: `Завершено ${completedLessons} из 20 уроков.`,
      earned: completedLessons >= 20,
      progress: completedLessons,
      target: 20,
      date:
        completedLessons >= 20 && lastActivity
          ? new Date(lastActivity.completedAt).toLocaleDateString("ru-RU")
          : undefined,
    },
    {
      code: "A-04",
      title: "Первый курс",
      detail:
        completedCourses >= 1
          ? `${completedCourses} курс(а) пройдено полностью.`
          : "Доведите один курс до 100% прогресса.",
      earned: completedCourses >= 1,
      progress: completedCourses,
      target: 1,
      date:
        completedCourses >= 1 && lastActivity
          ? new Date(lastActivity.completedAt).toLocaleDateString("ru-RU")
          : undefined,
    },
    {
      code: "A-05",
      title: "Серия 3 дня",
      detail: `Текущая серия: ${streak} дн. подряд с практикой.`,
      earned: streak >= 3,
      progress: streak,
      target: 3,
    },
    {
      code: "A-06",
      title: certificates.length > 1 ? `${certificates.length} сертификатов` : "Первый сертификат",
      detail: firstCertificate
        ? `Выдан по курсу «${firstCertificate.course.title}».`
        : "Сертификаты выдаются после завершения Premium-курсов.",
      earned: certificates.length >= 1,
      progress: certificates.length,
      target: 1,
      date: firstCertificate
        ? new Date(firstCertificate.issuedAt).toLocaleDateString("ru-RU")
        : undefined,
    },
    {
      code: "A-07",
      title: "Куратор своей полки",
      detail: `Сохранено ${saved} из 3 курсов в библиотеку.`,
      earned: saved >= 3,
      progress: saved,
      target: 3,
    },
    {
      code: "A-08",
      title: "Несколько треков",
      detail: `Активно ${activeCourses} из 3 курсов с начатым прогрессом.`,
      earned: activeCourses >= 3,
      progress: activeCourses,
      target: 3,
    },
  ]

  const earnedCount = achievements.filter((item) => item.earned).length

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">02 / Достижения</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.01em]">
            Отметки редакции
          </h2>
        </div>
        <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65]">
          Здесь нет случайных очков опыта — только редакционные отметки по фактам обучения: уроки,
          серия занятий, завершённые курсы, сертификаты и сохранённые материалы.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-4 border-t border-rule px-6 py-5 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">Открыто</div>
          <div className="mt-2 font-display text-[40px] leading-none tracking-[-0.02em]">
            {earnedCount}/{achievements.length}
          </div>
        </div>
        <div className="col-span-12 md:col-span-8">
          <div className="mono-label text-muted">Ближайшая цель</div>
          <p className="mt-2 text-[14px] leading-[1.65] text-foreground">
            {achievements.find((item) => !item.earned)?.detail ??
              "Все текущие отметки открыты. Продолжайте обучение, чтобы расширять архив сертификатов."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-rule md:grid-cols-2 lg:grid-cols-4">
        {achievements.map((a, i) => (
          <article
            key={a.code}
            className={[
              "px-6 py-8 md:px-8 md:py-10",
              i !== 0 ? "border-t md:border-t-0" : "",
              i % 2 !== 0 ? "md:border-l border-rule" : "",
              i >= 2 ? "lg:border-t border-rule" : "",
              i % 4 !== 0 ? "lg:border-l border-rule" : "",
              !a.earned ? "bg-panel/55 text-muted" : "",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-3">
              <div className={a.earned ? "mono-label text-accent" : "mono-label text-muted"}>
                {a.code}
              </div>
              <div className={a.earned ? "mono-label text-foreground" : "mono-label text-muted"}>
                {a.earned ? "Открыто" : "В работе"}
              </div>
            </div>
            <h3 className="mt-4 font-display text-[22px] leading-[1.15] tracking-[-0.01em] md:text-[24px]">
              {a.title}
            </h3>
            <p className="mt-3 min-h-[68px] text-[14px] leading-[1.55] text-foreground">
              {a.detail}
            </p>
            <div className="mt-6 h-[2px] bg-rule">
              <div
                className={a.earned ? "h-full bg-accent" : "h-full bg-muted"}
                style={{ width: `${pct(a.progress, a.target)}%` }}
                aria-hidden
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 mono-label text-muted">
              <span>
                {Math.min(a.progress, a.target)}/{a.target}
              </span>
              <span>{a.date ?? "цель"}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
