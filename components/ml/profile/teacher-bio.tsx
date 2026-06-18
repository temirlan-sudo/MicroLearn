"use client"

import { useAuth } from "@/lib/auth-context"
import { useCourses } from "@/lib/hooks"

/**
 * Био преподавателя и список категорий, которые он ведёт (из реальных курсов).
 */
export function TeacherBio() {
  const { user } = useAuth()
  const { data: myCourses } = useCourses(user?.id ? { teacherId: user.id, limit: 50 } : undefined)

  const expertise = Array.from(
    new Set((myCourses ?? []).map((c) => c.category).filter(Boolean)),
  ).slice(0, 8)

  const bioText =
    user?.bio?.trim() ||
    "Добавьте био в настройках аккаунта — здесь появится цитата и описание подхода."

  const meta: { period: string; role: string; detail: string }[] = []
  if (user?.education) {
    meta.push({
      period: "Образование",
      role: user.education,
      detail: "",
    })
  }
  if (user?.country) {
    meta.push({
      period: "Локация",
      role: user.country,
      detail: "",
    })
  }
  if (user?.createdAt) {
    meta.push({
      period: "На MicroLearn",
      role: `с ${new Date(user.createdAt).toLocaleDateString("ru-RU")}`,
      detail: `${myCourses?.length ?? 0} курс(ов) опубликовано`,
    })
  }

  return (
    <section className="border-t border-rule">
      <div className="grid grid-cols-12 gap-6 px-6 py-10 md:px-8 md:py-14">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">01 / О преподавателе</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.01em]">
            Кто ведёт
          </h2>
          <p className="mt-5 text-[15px] leading-[1.65] text-foreground">{bioText}</p>

          {expertise.length > 0 && (
            <div className="mt-8">
              <div className="mono-label text-muted">Экспертиза</div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
                {expertise.map((e) => (
                  <li key={e} className="border-b border-accent">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="col-span-12 md:col-span-8">
          {meta.length === 0 ? (
            <div className="border-t border-rule py-6 text-[14px] text-muted">
              Заполните профиль в разделе настроек, чтобы здесь появились сведения.
            </div>
          ) : (
            <ol className="border-t border-rule">
              {meta.map((entry) => (
                <li
                  key={entry.period}
                  className="grid grid-cols-12 gap-4 py-6 border-b border-rule"
                >
                  <div className="col-span-12 md:col-span-3 mono-label text-muted">
                    {entry.period}
                  </div>
                  <div className="col-span-12 md:col-span-9">
                    <div className="font-display text-[20px] md:text-[22px] leading-[1.2] tracking-[-0.01em]">
                      {entry.role}
                    </div>
                    {entry.detail && (
                      <p className="mt-2 text-[14px] leading-[1.6] text-foreground">
                        {entry.detail}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}
