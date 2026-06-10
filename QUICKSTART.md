# Быстрый старт MicroLearn

Краткая инструкция, чтобы запустить проект на Windows.

## Что нужно установить один раз

1. **Node.js** — скачай с [nodejs.org](https://nodejs.org) (LTS-версия, 22.x или новее).
2. **Docker Desktop** — скачай с [docker.com](https://www.docker.com/products/docker-desktop) и запусти.

> Проверка: открой `cmd` или PowerShell и напиши `node -v` — должно вывести версию. Убедись, что Docker Desktop запущён (иконка в трее).

## Шаги запуска

### 1. Распакуй архив

Просто распакуй папку `MicroLearn` куда удобно (например, на Рабочий стол).

### 2. Запускаем backend + базу данных

Открой терминал (PowerShell / CMD) **внутри папки проекта** и выполни:

```powershell
cp .env.example .env
docker compose up --build
```

> Это запустит PostgreSQL, backend, pgAdmin, Prometheus и Grafana. Первый раз собирает образ — может занять 2–5 минут.

Проверь, что backend живой: открой в браузере [http://localhost:7666/health](http://localhost:7666/health) — должен показать `{"status":"ok"}`.

### 3. Запускаем frontend

Открой **второй** терминал (первый должен продолжать работать) и в той же папке проекта выполни:

```powershell
npm install
npm run dev
```

> `npm install` ставит зависимости (первый раз может занять пару минут). `npm run dev` запускает frontend.

### 4. Открываем сайт

Перейди в браузере по адресу: **http://localhost:7865**

Готово — сайт работает локально.

## Где что находится

| Сервис | Адрес | Что это |
|--------|-------|---------|
| Сайт | http://localhost:7865 | Сам LMS (главная страница) |
| API | http://localhost:7666 | Backend (не трогай, просто фоном работает) |
| pgAdmin | http://localhost:8765 | Панель базы данных (логин/пароль в `.env`) |
| Grafana | http://localhost:9855 | Мониторинг (admin / admin) |
| Prometheus | http://localhost:8997 | Метрики |

## Демо-аккаунты (пароль у всех одинаковый)

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | `admin@microlearn.io` | `Password123!` |
| Преподаватель | `aigerim@microlearn.io` | `Password123!` |
| Студент | `temir@microlearn.io` | `Password123!` |

## Если что-то пошло не так

- **Порт занят** — если пишет, что `7865` или `7666` занят, перезагрузи компьютер или найди в Диспетчере задач `node.exe` / Docker-контейнеры и заверши их.
- **Backend не отвечает** — проверь, что Docker Desktop включён и команда `docker compose up --build` запущена в первом терминале.
- **Нет demo-данных** — останови Docker (`Ctrl+C` в первом терминале), потом снова `docker compose up --build`.

## Как выключить

- В терминале frontend нажми `Ctrl+C`.
- В терминале Docker нажми `Ctrl+C`, потом напиши `docker compose down`.
