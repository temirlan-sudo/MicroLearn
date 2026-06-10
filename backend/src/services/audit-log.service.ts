import { Request } from "express"
import { Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma"

type AuditInput = {
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Prisma.InputJsonValue
  req?: Request
}

export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.req?.user?.id ?? null,
        actorEmail: input.req?.user?.email ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? undefined,
        ipAddress: input.req?.ip ?? null,
      },
    })
  } catch (error) {
    console.warn("[audit-log]", error)
  }
}
