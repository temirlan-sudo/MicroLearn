import { Request, Response, NextFunction } from "express"
import { ZodSchema } from "zod"
import { HttpError } from "../lib/httpError"

type Source = "body" | "query" | "params"

export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      throw new HttpError(400, "Validation failed", result.error.issues)
    }
    // Overwrite with parsed (typed, coerced) value
    ;(req as any)[source] = result.data
    next()
  }
}
