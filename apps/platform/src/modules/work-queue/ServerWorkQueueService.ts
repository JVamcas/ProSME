import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readWorkQueue } from "@/modules/workflows/infrastructure/WorkQueueRepository";
import {
  decodeWorkQueueCursor,
  encodeWorkQueueCursor,
} from "./WorkQueueCursor";
import type { WorkQueueListInput, WorkQueuePage } from "./WorkQueueTypes";

export async function getWorkQueue(
  user: AuthenticatedUser | null,
  input: WorkQueueListInput,
): Promise<WorkQueuePage> {
  const actor = requirePermission(user, permissionCodes.workflowTaskAssignedRead);
  const projection = await readWorkQueue(
    actor.id,
    input,
    input.after ? decodeWorkQueueCursor(input.after) : undefined,
  );
  const hasNextPage = projection.items.length > input.limit;
  const items = projection.items.slice(0, input.limit);
  return {
    items,
    nextCursor: hasNextPage
      ? encodeWorkQueueCursor(items.at(-1)!)
      : null,
    total: projection.total,
  };
}
