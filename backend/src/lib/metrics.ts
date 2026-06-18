import { Request, Response, NextFunction } from "express"
import { collectDefaultMetrics, Counter, Histogram, Registry } from "prom-client"

// Отдельный registry, чтобы явно контролировать набор метрик.
export const registry = new Registry()

// Стандартные метрики процесса Node.js (CPU, память, event loop, GC).
collectDefaultMetrics({ register: registry, prefix: "microlearn_" })

// Каждый HTTP-запрос считаем в счётчике по методу/маршруту/статусу.
export const httpRequestsTotal = new Counter({
  name: "microlearn_http_requests_total",
  help: "Total number of HTTP requests handled by the backend",
  labelNames: ["method", "route", "status"] as const,
  registers: [registry],
})

// И длительность — в гистограмме, для перцентилей (p50, p95, p99).
export const httpRequestDuration = new Histogram({
  name: "microlearn_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"] as const,
  // Стандартные бакеты для web-трафика.
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
})

/**
 * Express-middleware, который замеряет каждый запрос.
 * Роут берём из Express route.path (а не req.path), чтобы не распухала кардинальность
 * от ID в URL (будет `/api/courses/:id`, а не `/api/courses/abc123xyz`).
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // /metrics сам себя не считаем — чтобы не перегревать ряды.
  if (req.path === "/metrics") return next()

  const endTimer = httpRequestDuration.startTimer()

  res.on("finish", () => {
    // Предпочитаем матчнутый Express-роут (низкая кардинальность — `/api/courses/:id`),
    // иначе падаем на req.path (будет реальный URL).
    const matched = req.route?.path ? `${req.baseUrl ?? ""}${req.route.path}` : req.path
    const labels = {
      method: req.method,
      route: matched || "unknown",
      status: String(res.statusCode),
    }
    httpRequestsTotal.inc(labels)
    endTimer(labels)
  })

  next()
}
