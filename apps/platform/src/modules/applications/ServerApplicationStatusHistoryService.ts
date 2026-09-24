import "server-only";

import { z } from "zod";
import { RequestValidationError } from "@/lib/resource-errors";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readOwnedApplicationStatusHistory } from "./infrastructure/ApplicationStatusHistoryRepository";

export async function getOwnApplicationStatusHistory(
  user: AuthenticatedUser | null,
  applicationId: string,
  input: { after?: string; limit: number },
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationOwnRead,
  );
  let cursor: { eventId: string; occurredAt: string } | null = null;
  if (input.after) {
    try {
      cursor = z.object({
        eventId: z.uuid(),
        occurredAt: z.iso.datetime(),
      }).parse(JSON.parse(Buffer.from(input.after, "base64url").toString("utf8")));
    } catch {
      throw new RequestValidationError("The status history cursor is invalid.");
    }
  }
  const rows = await readOwnedApplicationStatusHistory({
    applicationId,
    after: cursor ? {
      eventId: cursor.eventId,
      occurredAt: new Date(cursor.occurredAt),
    } : undefined,
    limit: input.limit,
    ownerUserId: actor.id,
  });
  const hasNextPage = rows.length > input.limit;
  const items = rows.slice(0, input.limit).map((row) => ({
    occurredAt: row.occurredAt.toISOString(),
    publicStatus: {
      status: row.status,
      label: row.label,
      description: row.description,
    },
  }));
  return {
    items,
    nextCursor: hasNextPage
      ? Buffer.from(JSON.stringify({
          eventId: rows[input.limit - 1]!.eventId,
          occurredAt: rows[input.limit - 1]!.occurredAt.toISOString(),
        })).toString("base64url")
      : null,
  };
}
