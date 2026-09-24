import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { applicationCommands } from "./application.schema";

export type ApplicationTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

export async function findApplicationCommand(
  transaction: ApplicationTransaction,
  actorUserId: string,
  idempotencyKey: string,
) {
  const [command] = await transaction
    .select()
    .from(applicationCommands)
    .where(and(
      eq(applicationCommands.actorUserId, actorUserId),
      eq(applicationCommands.idempotencyKey, idempotencyKey),
    ))
    .limit(1);
  return command ?? null;
}

export function applicationCommandMatches(
  command: NonNullable<Awaited<ReturnType<typeof findApplicationCommand>>>,
  commandType: "CREATE_DRAFT" | "SAVE_DRAFT_RESPONSE",
  requestFingerprint: string,
  applicationId?: string,
) {
  return command.commandType === commandType
    && command.requestFingerprint === requestFingerprint
    && (!applicationId || command.applicationId === applicationId);
}
