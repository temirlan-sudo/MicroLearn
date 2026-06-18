import {
  PrismaClient,
  Role,
  Plan,
  CourseStatus,
  LessonType,
  NotificationType,
  ReportStatus,
  AssignmentStatus,
  QuizQuestionType,
  CertificateStatus,
  AdaptiveReviewStatus,
} from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const avatar = (seed: string) => `https://picsum.photos/seed/${seed}/200/200`
const cover = (seed: string) => `https://picsum.photos/seed/${seed}/800/450`

const videoLibrary = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://media.w3.org/2010/05/sintel/trailer.mp4",
  "https://media.w3.org/2010/05/video/movie_300.mp4",
  "https://media.w3.org/2010/05/sintel/trailer.webm",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
]

const courseBlueprints: Record<
  string,
  { description: string; modules: string[]; lessons: string[] }
> = {
  "Intro to Figma": {
    description:
      "Практический старт в Figma: от структуры файла до первого кликабельного прототипа для учебного или коммерческого проекта.",
    modules: ["Рабочее пространство", "Компоненты и стили", "Прототип и передача"],
    lessons: ["Обзор интерфейса", "Сетка и фреймы", "Компоненты", "Контрольный чеклист"],
  },
  "Advanced UI Systems": {
    description:
      "Курс о дизайн-системах: токены, состояния компонентов, документация и поддержка единого интерфейса в продуктовой команде.",
    modules: ["Токены и правила", "Компонентная библиотека", "Документация системы"],
    lessons: ["Аудит интерфейса", "Состояния компонента", "Паттерны экранов", "Разбор кейса"],
  },
  "Full-Stack Next.js": {
    description:
      "Сборка full-stack приложения на Next.js: роутинг, серверные данные, формы, API-интеграция и деплой проекта.",
    modules: ["Архитектура App Router", "Данные и формы", "Деплой и качество"],
    lessons: ["Структура проекта", "Загрузка данных", "Server actions и API", "Мини-проект"],
  },
  "TypeScript Deep Dive": {
    description:
      "Глубокое погружение в TypeScript для реальных приложений: типизация API, generics, narrowing и безопасный рефакторинг.",
    modules: ["База строгой типизации", "Generics и модели", "Типизация приложения"],
    lessons: ["Strict mode", "Narrowing", "Generic helpers", "Практический тест"],
  },
  "Growth Marketing 101": {
    description:
      "Введение в growth marketing: гипотезы, воронки, метрики, эксперименты и связь маркетинга с продуктовой аналитикой.",
    modules: ["Воронка роста", "Эксперименты", "Метрики и выводы"],
    lessons: ["North Star Metric", "Карта гипотез", "A/B тест", "Разбор кампании"],
  },
  "SEO for Founders": {
    description:
      "SEO для основателей и маленьких команд: семантика, структура страниц, контент-план и базовая техническая оптимизация.",
    modules: ["Семантика", "Страницы и контент", "Технический минимум"],
    lessons: ["Поисковый спрос", "Кластеризация", "Контент-бриф", "SEO-аудит"],
  },
}

function textLesson(
  courseTitle: string,
  moduleTitle: string,
  lessonTitle: string,
  m: number,
  l: number,
): string {
  return [
    `${lessonTitle}: учебный материал курса «${courseTitle}».`,
    `В этом разделе разбираем тему «${moduleTitle.toLowerCase()}» через короткий практический сценарий. Сначала зафиксируйте цель урока, затем повторите пример на своем проекте и проверьте результат по чеклисту.`,
    `Практика: откройте рабочий файл или заметку, выпишите 3 наблюдения, 2 решения и 1 вопрос, который стоит обсудить с преподавателем. Такой формат помогает не просто прочитать материал, а превратить его в действие.`,
    `Мини-чеклист ${m}.${l}: цель понятна, пример повторен, один вывод записан, следующий шаг определен.`,
  ].join("\n\n")
}

function quizLesson(courseTitle: string, moduleTitle: string): string {
  return [
    `Проверка модуля курса «${courseTitle}».`,
    `Ответьте письменно на три вопроса: что было главным понятием в модуле «${moduleTitle}», где это применяется в реальном проекте, и какую ошибку теперь можно избежать?`,
    "Если ответы занимают меньше пяти предложений, вернитесь к предыдущим урокам и дополните конспект конкретным примером.",
  ].join("\n\n")
}

function adaptiveTopics(courseTitle: string): string[] {
  if (courseTitle.includes("Next.js")) {
    return ["JavaScript Basics", "React Components", "React Hooks", "Async/Await"]
  }
  if (courseTitle.includes("TypeScript")) {
    return ["TypeScript Types", "Async/Await", "JavaScript Basics", "React Hooks"]
  }
  if (courseTitle.includes("Figma") || courseTitle.includes("UI")) {
    return ["CSS Layout", "React Components", "JavaScript Basics", "TypeScript Types"]
  }
  return ["JavaScript Basics", "CSS Layout", "Async/Await", "React Components"]
}

async function main() {
  console.log("Seeding MicroLearn database...")

  // Clean up (order matters due to FK)
  await prisma.auditLog.deleteMany()
  await prisma.planPayment.deleteMany()
  await prisma.adaptiveReview.deleteMany()
  await prisma.studentWeakTopic.deleteMany()
  await prisma.microlearningCard.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.moderationReport.deleteMany()
  await prisma.quizAttempt.deleteMany()
  await prisma.quizQuestion.deleteMany()
  await prisma.quiz.deleteMany()
  await prisma.assignmentSubmission.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.certificate.deleteMany()
  await prisma.lessonProgress.deleteMany()
  await prisma.favorite.deleteMany()
  await prisma.review.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.module.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()

  const password = await bcrypt.hash("Password123!", 10)

  // Teachers
  const admin = await prisma.user.create({
    data: {
      name: "MicroLearn Admin",
      email: "admin@microlearn.io",
      passwordHash: password,
      role: Role.ADMIN,
      plan: Plan.PREMIUM,
      avatarUrl: avatar("admin"),
      bio: "Moderator account for reviewing users, courses, reports, and platform health.",
      country: "Kazakhstan",
    },
  })

  // Teachers
  const teachers = await Promise.all(
    [
      {
        name: "Aigerim Bekova",
        email: "aigerim@microlearn.io",
        bio: "Senior UI/UX designer, 8+ years.",
        seed: "teacher1",
      },
      {
        name: "Daniyar Tulegenov",
        email: "daniyar@microlearn.io",
        bio: "Full-stack engineer, ex-FAANG.",
        seed: "teacher2",
      },
      {
        name: "Saule Zhumabek",
        email: "saule@microlearn.io",
        bio: "Growth marketer and strategist.",
        seed: "teacher3",
      },
    ].map((t) =>
      prisma.user.create({
        data: {
          name: t.name,
          email: t.email,
          passwordHash: password,
          role: Role.TEACHER,
          plan: Plan.PREMIUM,
          avatarUrl: avatar(t.seed),
          bio: t.bio,
          country: "Kazakhstan",
        },
      }),
    ),
  )

  // Students
  const students = await Promise.all(
    [
      { name: "Temir Student", email: "temir@microlearn.io", plan: Plan.PREMIUM, seed: "s1" },
      { name: "Madina Learner", email: "madina@microlearn.io", plan: Plan.FREE, seed: "s2" },
    ].map((s) =>
      prisma.user.create({
        data: {
          name: s.name,
          email: s.email,
          passwordHash: password,
          role: Role.STUDENT,
          plan: s.plan,
          avatarUrl: avatar(s.seed),
          age: 22,
          country: "Kazakhstan",
          education: "Bachelor's",
          learningGoal: "Land a job in tech",
        },
      }),
    ),
  )

  // Courses
  const courseDefs = [
    { title: "Intro to Figma", category: "Design", price: 0, isFree: true, teacher: 0 },
    { title: "Advanced UI Systems", category: "Design", price: 39.99, isFree: false, teacher: 0 },
    { title: "Full-Stack Next.js", category: "Dev", price: 49.99, isFree: false, teacher: 1 },
    { title: "TypeScript Deep Dive", category: "Dev", price: 0, isFree: true, teacher: 1 },
    {
      title: "Growth Marketing 101",
      category: "Marketing",
      price: 19.99,
      isFree: false,
      teacher: 2,
    },
    { title: "SEO for Founders", category: "Marketing", price: 0, isFree: true, teacher: 2 },
  ]

  const courses = []
  for (let i = 0; i < courseDefs.length; i++) {
    const c = courseDefs[i]
    const course = await prisma.course.create({
      data: {
        title: c.title,
        description: courseBlueprints[c.title].description,
        category: c.category,
        price: c.price,
        isFree: c.isFree,
        status: CourseStatus.PUBLISHED,
        coverUrl: cover(`course${i}`),
        teacherId: teachers[c.teacher].id,
      },
    })

    // 3 modules × 4 lessons
    const blueprint = courseBlueprints[c.title]
    for (let m = 1; m <= 3; m++) {
      const moduleTitle = blueprint.modules[m - 1]
      const mod = await prisma.module.create({
        data: { title: `${m}. ${moduleTitle}`, order: m, courseId: course.id },
      })
      for (let l = 1; l <= 4; l++) {
        const type = l === 1 ? LessonType.VIDEO : l === 4 ? LessonType.QUIZ : LessonType.TEXT
        const lessonTitle = blueprint.lessons[l - 1]
        await prisma.lesson.create({
          data: {
            title: `${m}.${l} ${lessonTitle}`,
            type,
            content:
              type === LessonType.VIDEO
                ? videoLibrary[(i + m + l) % videoLibrary.length]
                : type === LessonType.TEXT
                  ? textLesson(c.title, moduleTitle, lessonTitle, m, l)
                  : quizLesson(c.title, moduleTitle),
            order: l,
            duration: type === LessonType.VIDEO ? 300 : null,
            moduleId: mod.id,
          },
        })
      }
    }
    courses.push(course)
  }

  // Enrollments for students
  for (const s of students) {
    for (const c of courses.slice(0, 3)) {
      await prisma.enrollment.create({ data: { userId: s.id, courseId: c.id } })
    }
  }

  const lessons = await prisma.lesson.findMany({
    include: { module: { select: { courseId: true, order: true } } },
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
  })

  const firstTextLessonByCourse = new Map<string, (typeof lessons)[number]>()
  for (const lesson of lessons) {
    if (lesson.type === LessonType.TEXT && !firstTextLessonByCourse.has(lesson.module.courseId)) {
      firstTextLessonByCourse.set(lesson.module.courseId, lesson)
    }
  }

  const assignments = []
  for (const [courseId, lesson] of firstTextLessonByCourse) {
    const course = courses.find((item) => item.id === courseId)
    assignments.push(
      await prisma.assignment.create({
        data: {
          lessonId: lesson.id,
          title: `Практика: ${lesson.title}`,
          instructions:
            "Сдайте короткий разбор: цель урока, что получилось применить, и один вопрос преподавателю. 6-10 предложений достаточно для demo-проверки.",
          maxScore: 100,
        },
      }),
    )
    if (course?.id === courses[0].id) {
      await prisma.assignmentSubmission.create({
        data: {
          assignmentId: assignments[assignments.length - 1].id,
          userId: students[0].id,
          reviewerId: teachers[0].id,
          content:
            "Я разобрал структуру фреймов, собрал простой экран и отметил, где нужно вынести повторяющиеся элементы в компоненты. Вопрос: когда лучше создавать локальный компонент, а когда уже оформлять элемент как часть дизайн-системы?",
          status: AssignmentStatus.REVIEWED,
          score: 92,
          feedback:
            "Хороший практический разбор. На защите можно показать, что преподаватель видит работу и оставляет оценку.",
          reviewedAt: new Date(),
        },
      })
    }
  }

  const quizLessons = lessons.filter((lesson) => lesson.type === LessonType.QUIZ)
  const quizzes = []
  for (const lesson of quizLessons) {
    const course = courses.find((item) => item.id === lesson.module.courseId)
    const topics = adaptiveTopics(course?.title ?? "")
    const quiz = await prisma.quiz.create({
      data: {
        lessonId: lesson.id,
        title: `Тест: ${lesson.title}`,
        passingScore: 70,
        questions: {
          create: [
            {
              type: QuizQuestionType.SINGLE_CHOICE,
              text: "Что важнее всего после короткого практического урока?",
              topic: topics[0],
              options: [
                "Закрыть вкладку",
                "Зафиксировать вывод и следующий шаг",
                "Сразу менять стек",
              ],
              correctAnswers: ["Зафиксировать вывод и следующий шаг"],
              points: 1,
              order: 1,
            },
            {
              type: QuizQuestionType.MULTIPLE_CHOICE,
              text: "Какие действия помогают закрепить материал?",
              topic: topics[1],
              options: ["Повторить пример", "Записать вопрос", "Игнорировать чеклист"],
              correctAnswers: ["Повторить пример", "Записать вопрос"],
              points: 2,
              order: 2,
            },
          ],
        },
      },
      include: { questions: true },
    })
    quizzes.push(quiz)
  }

  const cardTemplates: Record<string, { front: string; back: string; hint?: string }[]> = {
    "JavaScript Basics": [
      {
        front: "Что делает `const` в JavaScript?",
        back: "`const` запрещает переназначить переменную, но объект внутри всё ещё может изменяться.",
        hint: "Подумайте о разнице между ссылкой и содержимым.",
      },
      {
        front: "Чем отличается `===` от `==`?",
        back: "`===` сравнивает без приведения типов, поэтому результат предсказуемее.",
      },
      {
        front: "Что возвращает функция без `return`?",
        back: "Она возвращает `undefined`.",
      },
    ],
    "React Components": [
      {
        front: "Что такое React component?",
        back: "Это функция или класс, который возвращает UI и может получать данные через props.",
      },
      {
        front: "Зачем компонентам props?",
        back: "Props передают входные данные от родителя к дочернему компоненту.",
      },
      {
        front: "Почему компонент лучше держать маленьким?",
        back: "Маленький компонент проще читать, тестировать и переиспользовать.",
      },
    ],
    "React Hooks": [
      {
        front: "Для чего нужен `useEffect`?",
        back: "`useEffect` запускает побочные эффекты после рендера: загрузку данных, подписки, синхронизацию.",
        hint: "Это не место для вычисления обычных значений.",
      },
      {
        front: "Почему hooks нельзя вызывать внутри условий?",
        back: "React должен видеть одинаковый порядок вызовов hooks при каждом рендере.",
      },
      {
        front: "Когда нужен dependency array в `useEffect`?",
        back: "Он показывает, при изменении каких значений эффект должен запускаться заново.",
      },
    ],
    "TypeScript Types": [
      {
        front: "Что делает union type?",
        back: "Union разрешает значению быть одним из нескольких типов, например `string | number`.",
      },
      {
        front: "Зачем нужен type narrowing?",
        back: "Narrowing сужает тип после проверки и помогает безопасно работать со значением.",
      },
      {
        front: "Чем interface полезен для API-модели?",
        back: "Он фиксирует форму объекта и делает контракт между backend и frontend явным.",
      },
    ],
    "CSS Layout": [
      {
        front: "Когда удобнее использовать CSS Grid?",
        back: "Grid хорошо подходит для двумерных сеток: строки и колонки одновременно.",
      },
      {
        front: "Когда удобнее использовать Flexbox?",
        back: "Flexbox удобен для одномерного расположения элементов в строке или колонке.",
      },
      {
        front: "Что делает `gap`?",
        back: "`gap` задаёт расстояние между элементами без лишних margin-хаков.",
      },
    ],
    "Async/Await": [
      {
        front: "Что делает `await`?",
        back: "`await` ждёт завершения Promise и возвращает его результат внутри async-функции.",
      },
      {
        front: "Что вернёт async-функция?",
        back: "Async-функция всегда возвращает Promise.",
      },
      {
        front: "Где ловить ошибку от `await`?",
        back: "Обычно через `try/catch`, чтобы обработать rejected Promise.",
      },
    ],
  }

  const firstQuizLessonByCourse = new Map<string, (typeof lessons)[number]>()
  for (const lesson of lessons) {
    if (lesson.type === LessonType.QUIZ && !firstQuizLessonByCourse.has(lesson.module.courseId)) {
      firstQuizLessonByCourse.set(lesson.module.courseId, lesson)
    }
  }

  const cardsByCourseTopic = new Map<string, { id: string; topic: string; courseId: string }[]>()
  for (const course of courses) {
    const lesson = firstQuizLessonByCourse.get(course.id) ?? null
    const topics = adaptiveTopics(course.title)
    for (const topic of topics) {
      const templates = cardTemplates[topic] ?? cardTemplates["JavaScript Basics"]
      const created = await prisma.microlearningCard.createManyAndReturn({
        data: templates.slice(0, 3).map((card) => ({
          courseId: course.id,
          lessonId: lesson?.id ?? null,
          topic,
          front: card.front,
          back: card.back,
          hint: card.hint,
          createdById: course.teacherId,
        })),
        select: { id: true, topic: true, courseId: true },
      })
      cardsByCourseTopic.set(`${course.id}:${topic}`, created)
    }
  }

  const firstQuiz = quizzes[0]
  if (firstQuiz) {
    await prisma.quizAttempt.create({
      data: {
        quizId: firstQuiz.id,
        userId: students[0].id,
        answers: [
          {
            questionId: firstQuiz.questions.find((q) => q.order === 1)!.id,
            answer: "Зафиксировать вывод и следующий шаг",
          },
          {
            questionId: firstQuiz.questions.find((q) => q.order === 2)!.id,
            answer: ["Повторить пример", "Записать вопрос"],
          },
        ],
        score: 3,
        maxScore: 3,
        passed: true,
      },
    })

    const demoCourseId = lessons.find((lesson) => lesson.id === firstQuiz.lessonId)?.module.courseId
    const demoTopics = demoCourseId ? ["CSS Layout", "TypeScript Types"] : []
    for (const [index, topic] of demoTopics.entries()) {
      await prisma.studentWeakTopic.create({
        data: {
          studentId: students[0].id,
          courseId: demoCourseId!,
          topic,
          attemptsCount: index === 0 ? 5 : 3,
          mistakesCount: index === 0 ? 3 : 2,
          lastMistakeAt: new Date(),
          strengthScore: index === 0 ? 40 : 34,
        },
      })
      const dueCards = (cardsByCourseTopic.get(`${demoCourseId}:${topic}`) ?? []).slice(
        0,
        index === 0 ? 3 : 2,
      )
      for (const card of dueCards) {
        await prisma.adaptiveReview.create({
          data: {
            studentId: students[0].id,
            courseId: demoCourseId!,
            cardId: card.id,
            topic,
            status: AdaptiveReviewStatus.DUE,
            correctStreak: 0,
            wrongCount: index + 1,
            nextReviewAt: new Date(Date.now() - 60 * 60 * 1000),
          },
        })
      }
    }
  }

  // Reviews — 15
  const reviewers = students
  let reviewCount = 0
  for (const c of courses) {
    for (let i = 0; i < 3 && reviewCount < 15; i++) {
      const user = reviewers[i % reviewers.length]
      try {
        await prisma.review.create({
          data: {
            rating: 3 + ((i + reviewCount) % 3),
            comment: `Great content for ${c.title}! Really enjoyed module ${i + 1}.`,
            userId: user.id,
            courseId: c.id,
          },
        })
        reviewCount++
      } catch {
        /* unique constraint — skip */
      }
    }
  }

  // Notifications
  for (const u of [...teachers, ...students]) {
    await prisma.notification.createMany({
      data: [
        {
          userId: u.id,
          type: NotificationType.SYSTEM,
          title: "Welcome to MicroLearn",
          body: "Your account is ready. Explore courses now.",
        },
        {
          userId: u.id,
          type: NotificationType.ENROLLMENT,
          title: "New enrollment",
          body: "A student just enrolled in one of your courses.",
          read: true,
        },
      ],
    })
  }

  await prisma.moderationReport.createMany({
    data: [
      {
        reporterId: students[0].id,
        courseId: courses[1].id,
        assignedToId: admin.id,
        reason: "Проверить описание курса",
        details: "Студент просит уточнить, какие навыки нужны перед началом курса.",
        status: ReportStatus.REVIEWING,
      },
      {
        reporterId: students[1].id,
        courseId: courses[2].id,
        assignedToId: admin.id,
        reason: "Непонятный материал урока",
        details: "В одном из модулей не хватает пояснения к практическому заданию.",
        status: ReportStatus.OPEN,
      },
      {
        reporterId: students[0].id,
        courseId: courses[3].id,
        assignedToId: admin.id,
        reason: "Проверить видео",
        details: "Видео открывается, но студент предлагает добавить краткий конспект под роликом.",
        status: ReportStatus.RESOLVED,
        resolution: "Добавлен текстовый конспект в материалы урока.",
      },
    ],
  })

  await prisma.certificate.create({
    data: {
      userId: students[0].id,
      courseId: courses[0].id,
      fileUrl: "/uploads/certificates/demo-certificate.pdf",
      verificationCode: "ML-DEMO-2026",
      status: CertificateStatus.VALID,
    },
  })

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: students[0].id,
        actorEmail: students[0].email,
        action: "assignment.submitted",
        entityType: "AssignmentSubmission",
        metadata: { demo: true },
      },
      {
        actorId: teachers[0].id,
        actorEmail: teachers[0].email,
        action: "assignment.reviewed",
        entityType: "AssignmentSubmission",
        metadata: { score: 92 },
      },
      {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "certificate.verified",
        entityType: "Certificate",
        metadata: { verificationCode: "ML-DEMO-2026" },
      },
      {
        actorId: students[0].id,
        actorEmail: students[0].email,
        action: "ADAPTIVE_WEAK_TOPIC_DETECTED",
        entityType: "StudentWeakTopic",
        metadata: { topic: "CSS Layout", demo: true },
      },
    ],
  })

  console.log("✅ Seed complete")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
