# MicroLearn

MicroLearn — дипломный MVP LMS-платформы для коротких практических курсов. Проект показывает полный учебный сценарий: пользователь находит курс, регистрируется, записывается, проходит уроки, отслеживает прогресс и получает сертификат. Преподаватель может создавать и публиковать курсы, а администратор — смотреть состояние платформы и модерацию.

Проект рассчитан на локальную демонстрацию перед комиссией колледжа. Оплата работает через Stripe test mode: реальные деньги не списываются, но frontend и backend проходят настоящий PaymentIntent-сценарий.

## Возможности проекта

- Регистрация, вход, refresh token и выход из аккаунта.
- Роли `STUDENT`, `TEACHER`, `ADMIN`.
- Главная страница, тарифы, поиск, страницы курса и публичные профили.
- Каталог курсов с категориями, ценой, рейтингом и преподавателем.
- Запись студента на курс, избранное, отзывы и прогресс по урокам.
- Задания к урокам: сдача работы студентом, проверка преподавателем, оценка и обратная связь.
- Тесты к урокам: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, автопроверка и попытки прохождения.
- Adaptive Microlearning Engine: слабые темы по ошибкам в quiz, карточки повторения, Daily Challenge и простое spaced repetition-расписание.
- Кабинет студента: активные курсы, расписание, прогресс, профиль.
- Кабинет преподавателя: статистика, список курсов, создание курса, модули, уроки, аналитика по студентам и Adaptive Insights.
- Admin-панель: пользователи, курсы, жалобы, сертификаты, audit log и общая статистика.
- Генерация сертификатов, публичная проверка по `verificationCode` и административный отзыв сертификата.
- Audit log ключевых действий: запись на курс, завершение урока, сдача задания, попытка теста, тариф и сертификаты.
- Socket.IO-уведомления.
- Prometheus/Grafana для демонстрации мониторинга backend.
- Docker Compose для локального запуска backend-инфраструктуры.

## Роли пользователей

| Роль      | Что может делать                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `STUDENT` | Смотреть курсы, записываться, проходить уроки, видеть прогресс, оставлять отзывы, получать сертификаты.                |
| `TEACHER` | Создавать курсы, публиковать/снимать курсы, добавлять модули и уроки, проверять задания, смотреть аналитику студентов. |
| `ADMIN`   | Смотреть пользователей, курсы, жалобы, audit log, сертификаты и общую сводку платформы.                                |

## Технологический стек

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, Radix UI-паттерны.
- Backend: Express, TypeScript, Prisma, Socket.IO.
- Database: PostgreSQL.
- Auth: JWT access token и httpOnly refresh cookie.
- Files: Multer uploads, PDF certificates.
- Learning features: assignments, submissions, quiz attempts, adaptive review cards, certificate verification, audit log.
- Monitoring: Prometheus, Grafana, `prom-client`.
- Tests: Vitest, Supertest, Playwright smoke test.
- Package manager: npm.

## Требования для запуска

- Node.js 22+.
- npm 10+.
- Docker Desktop, если запускается полный backend-контур через `docker compose`.
- Свободные порты: `7865`, `7666`, `8765`, `8997`, `9855`.

В проекте используется npm. Основные lockfile: `package-lock.json` и `backend/package-lock.json`. Не смешивайте npm с pnpm/yarn при подготовке демо.

## Установка

Frontend:

```bash
npm install
```

Backend, если запускается отдельно без Docker:

```bash
cd backend
npm install
```

## Запуск frontend

```bash
npm run dev
```

Frontend откроется на:

```text
http://localhost:7865
```

Для production-сборки:

```bash
npm run build
npm run start
```

## Запуск backend / Docker

Рекомендуемый способ для защиты — Docker Compose. Он запускает PostgreSQL, backend, pgAdmin, Prometheus и Grafana.

```bash
cp .env.example .env
docker compose up --build
```

Сервисы:

| Сервис      | URL                                         |
| ----------- | ------------------------------------------- |
| Frontend    | `http://localhost:7865` после `npm run dev` |
| Backend API | `http://localhost:7666`                     |
| pgAdmin     | `http://localhost:8765`                     |
| Prometheus  | `http://localhost:8997`                     |
| Grafana     | `http://localhost:9855`                     |

Backend health-check:

```text
http://localhost:7666/health
```

Docker entrypoint backend выполняет `prisma db push`, seed demo-данных и запуск сервера. Это удобно для дипломной демонстрации. Для production вместо `db push` лучше использовать Prisma migrations.

Если backend запускается вручную:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

## Demo-аккаунты

Все seed-пользователи используют пароль:

```text
Password123!
```

| Роль      | Email                   |
| --------- | ----------------------- |
| `ADMIN`   | `admin@microlearn.io`   |
| `TEACHER` | `aigerim@microlearn.io` |
| `TEACHER` | `daniyar@microlearn.io` |
| `TEACHER` | `saule@microlearn.io`   |
| `STUDENT` | `temir@microlearn.io`   |
| `STUDENT` | `madina@microlearn.io`  |

Для демонстрации Adaptive Microlearning Engine используйте связку:

- студент: `temir@microlearn.io` / `Password123!`;
- преподаватель: `aigerim@microlearn.io` / `Password123!`;
- курс преподавателя: `Intro to Figma`.

После fresh seed студент Temir сразу видит 5 карточек в Daily Challenge:

- 3 карточки по `CSS Layout`;
- 2 карточки по `TypeScript Types`;
- 2 слабые темы в списке Weak Topics.

## Adaptive Microlearning Engine

Adaptive Microlearning Engine — это локальная учебная логика без AI и без внешних сервисов. Система не генерирует текст. Она анализирует уже готовые quiz-вопросы и заранее созданные преподавателем карточки.

Как работает:

1. У каждого quiz-вопроса есть `topic`, например `React Hooks`, `TypeScript Types`, `CSS Layout`.
2. Когда студент ошибается в quiz, backend записывает тему как слабую в `StudentWeakTopic`.
3. Backend ищет готовые `MicrolearningCard` по этой теме и создаёт `AdaptiveReview`.
4. В кабинете студента появляется Daily Challenge: карточки, которые нужно повторить сегодня.
5. После ответа на карточку расписание обновляется:
   - ошибся -> завтра;
   - ответил правильно -> через 3 дня;
   - снова правильно -> через 7 дней;
   - несколько правильных подряд -> через 14 дней.

Student видит только свои слабые темы и карточки. Teacher видит Adaptive Insights только по своим курсам и может создавать, редактировать и удалять карточки. Admin может управлять карточками по всем курсам.

Основные endpoints:

```text
GET  /api/adaptive/weak-topics
GET  /api/adaptive/daily-challenge
POST /api/adaptive/review/:id/answer
GET  /api/teacher/adaptive/course/:courseId/insights
GET  /api/adaptive/cards?courseId=...
POST /api/adaptive/cards
PATCH /api/adaptive/cards/:id
DELETE /api/adaptive/cards/:id
```

## Stripe test mode оплата

В дипломном MVP оплата подключена через Stripe test mode. Это безопасный режим Stripe: можно показать реальный `PaymentIntent`, Stripe Elements и подтверждение оплаты, но банковские деньги не списываются.

Endpoint:

```text
POST /api/plans/subscribe
POST /api/plans/confirm
```

`/api/plans/subscribe` создаёт Stripe `PaymentIntent` для платного тарифа и возвращает `clientSecret`. Frontend показывает Stripe Elements, пользователь вводит тестовую карту `4242 4242 4242 4242`, после успешного подтверждения `/api/plans/confirm` обновляет тариф пользователя и сохраняет `stripe_payment_id` в базе.

Для работы нужны тестовые ключи:

```text
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Почему используется test mode

Цель проекта — показать LMS-функциональность и безопасную демонстрацию оплаты без обработки реальных банковских денег. Stripe test mode позволяет пройти почти настоящий сценарий оплаты, но без финансового риска для студента и комиссии.

## Почему Google/OAuth вход не входит в MVP

Вход через Google/OAuth не входит в текущий MVP, потому что основная цель проекта — демонстрация LMS-функциональности: курсы, роли, обучение, прогресс и администрирование. OAuth можно добавить как дальнейшее развитие проекта. Сейчас реализован вход по email/password, JWT access token и httpOnly refresh cookie.

## Сценарий демонстрации для защиты

1. Запустить backend-инфраструктуру:

```bash
docker compose up --build
```

2. Запустить frontend:

```bash
npm run dev
```

3. Открыть `http://localhost:7865` и показать главную страницу.
4. Показать поиск по курсам: например `/search?q=react`.
5. Открыть страницу курса и объяснить программу, цену, отзывы и прогресс.
6. Войти как студент `temir@microlearn.io` / `Password123!`.
7. Показать кабинет студента, список курсов и продолжение обучения.
8. Открыть `/student/adaptive` и показать начальное состояние после seed: 5 карточек на сегодня и 2 слабые темы.
9. Нажать "Показать ответ" на карточке и выбрать "Знал" или "Ошибся", чтобы показать обновление расписания повторения.
10. Открыть курс `Intro to Figma`, урок `1.4 Контрольный чеклист`, пройти quiz и специально ошибиться в ответах.
11. Вернуться на `/student/adaptive` и показать, что Daily Challenge и список слабых тем обновились по темам ошибок, например `CSS Layout` и `React Components`.
12. Объяснить, что Adaptive Engine не использует AI: он берёт тему ошибки и заранее созданные карточки.
13. Войти как преподаватель `aigerim@microlearn.io` / `Password123!`.
14. Открыть кабинет преподавателя и курс `Intro to Figma`.
15. В Adaptive Insights показать топ слабых тем, количество ошибок, студентов и карточки курса.
16. Войти как администратор `admin@microlearn.io` / `Password123!`.
17. Показать admin-панель: пользователи, курсы, жалобы, сертификаты и audit log.
18. Открыть `/certificates/verify/ML-DEMO-2026` и показать публичную проверку сертификата.
19. При необходимости отозвать demo-сертификат в admin-панели и обновить страницу проверки.
20. Открыть `/pricing`, выбрать платный тариф и показать Stripe test mode оплату картой `4242 4242 4242 4242`.
21. Коротко объяснить, что Google/OAuth не входит в MVP и может быть добавлен позже.

## Проверка качества

Проект покрыт юнит- и интеграционными тестами на Vitest + Supertest.

### Frontend

**`tests/frontend-smoke.test.ts`** — smoke-тесты утилит форматирования UI:

- Проверяет форматирование денег (`formatKZT`) — отображает сумму в тенге с пробелом-разделителем разрядов.
- Проверяет форматирование чисел (`formatNumber`) — тысячный разделитель.
- Проверяет компактный формат (`formatCompact`) — сокращение "тыс." для больших чисел.

### Backend

**`backend/src/services/quiz.service.test.ts`** — юнит-тесты логики оценки тестов (quiz):

- Оценивает `SINGLE_CHOICE` и `MULTIPLE_CHOICE` вопросы: при полном совпадении ответов начисляются все баллы.
- Проверяет, что неполный ответ на `MULTIPLE_CHOICE` (выбран не весь набор правильных вариантов) даёт 0 баллов — частичные баллы не начисляются.

**`backend/src/services/learning-flow.test.ts`** — юнит-тесты бизнес-процессов обучения (с моком Prisma):

- Разрешает запись на курс, если план пользователя удовлетворяет ограничениям.
- Блокирует запись, когда лимит бесплатного плана достигнут (например, 3 записи).
- Вычисляет процент прогресса курса на основе количества завершённых уроков.
- Выдаёт сертификат после завершения курса и сохраняет URL PDF.

**`backend/src/routes/adaptive.test.ts`** — интеграционные тесты Adaptive Microlearning Engine (Supertest + мок Prisma):

- Неправильный ответ в quiz создаёт weak topic и review items по карточкам темы.
- Ответ на карточку обновляет `nextReviewAt`, `correctStreak` и `wrongCount`.
- Student видит только свои weak topics.
- Teacher видит insights только по своим курсам.
- Student не может создавать flashcards.
- Проверяет выдачу сертификата: создаётся запись в БД и файл сохраняется в `uploads/certificates/`.

**`backend/src/routes/auth.test.ts`** — интеграционные тесты авторизации (Supertest, мок Prisma + email):

- Регистрация нового пользователя: возвращает `accessToken`, безопасный payload (без `passwordHash`) и httpOnly cookie `mlrt`.
- Полный жизненный цикл сессии: логин → refresh токена → logout. Проверяется, что refresh обновляет access token, а logout завершает сессию (`204`).

**`backend/src/routes/lms-features.test.ts`** — интеграционные тесты LMS-функциональности (Supertest, мок Prisma):

- Сценарий "студент сдаёт задание → преподаватель проверяет и ставит оценку".
- Автопроверка quiz-attempt: отправка ответов, вычисление баллов и прохождение/непрохождение теста.
- Защита прав доступа: студент не может проверять задания (`403`).
- Публичная проверка сертификата по `verificationCode`.
- Отзыв сертификата администратором и защита audit-logs: только `ADMIN` может просматривать логи аудита.

## Гайд по коду простыми словами

Для подготовки к защите добавлен отдельный файл:

```text
CODE_GUIDE_RU.md
```

В нём проект объясняется простыми аналогиями: frontend как витрина, backend как администрация, database как склад, routes как официанты, middleware как охрана.

Также там отдельно описано, как работает Stripe test mode и что честно сказать комиссии про будущий переход на production-ключи.

Frontend:

```bash
npm run format
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Backend:

```bash
cd backend
npm run lint
npm run test
npm run build
```

## Известные ограничения demo-версии

- Оплата работает через Stripe test mode. Реальные деньги не списываются.
- Google/OAuth вход не реализован в MVP.
- Email отправляется через SMTP только если он настроен; иначе используется stub-логирование.
- В demo-окружении используются seed-данные и `prisma db push`; для production нужны миграции.
- Demo-секреты в `.env.example` предназначены только для локального запуска.
- Audit log хранит учебные события demo-версии, но не является production SIEM-системой.
- Проверка сертификата публичная, но отзыв сертификата доступен только администратору.
- `npm audit` может показывать предупреждения по зависимостям:
  - frontend: умеренные предупреждения из цепочки Next/PostCSS/@vercel analytics; безопасное patch-обновление Next.js выполнено, `npm audit fix --force` не используется, потому что npm предлагает breaking-изменения;
  - backend: предупреждение по `nodemailer`; исправление требует major-обновления через force, поэтому для MVP оно задокументировано как ограничение. В demo-режиме email может работать через stub без отправки реальной почты.

Эти ограничения не блокируют защиту, потому что не мешают показать основную LMS-логику проекта.

## Troubleshooting / частые проблемы запуска

### Порт занят

Если `7865` или `7666` уже заняты, остановите старый процесс или измените порт в npm script / `.env`.

### Backend не отвечает

Проверьте:

```bash
docker compose ps
docker logs microlearn-backend
```

И откройте:

```text
http://localhost:7666/health
```

### Нет demo-данных

Перезапустите seed:

```bash
cd backend
npm run prisma:seed
```

При Docker-запуске seed выполняется автоматически в entrypoint backend.

### Frontend не видит backend

Проверьте `.env.local`:

```text
NEXT_PUBLIC_API_URL=http://localhost:7666/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:7666
```

### Ошибка зависимостей

Используйте npm:

```bash
npm install
cd backend
npm install
```

Не используйте одновременно pnpm/yarn и npm в одной рабочей копии.

## Дальнейшее развитие

- Подключить реальный платёжный провайдер.
- Добавить Google/OAuth как альтернативный вход.
- Расширить e2e-тесты.
- Перейти с `prisma db push` на миграции.
- Добавить больше типов уроков, заданий и модерации.
