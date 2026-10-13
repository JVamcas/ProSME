import "server-only";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  requireAnyPermission,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  adminApplicationExportSchema,
  type AdminApplicationExportInput,
} from "./api/AdminApplicationSchemas";
import { listAdminApplications } from "./ServerAdminApplicationService";
import { writeAdminApplicationExport } from "./infrastructure/AdminApplicationExportWriter";

async function* applicationBatches(
  user: AuthenticatedUser,
  input: AdminApplicationExportInput,
  signal: AbortSignal,
) {
  let after: string | undefined;
  do {
    signal.throwIfAborted();
    const page = await listAdminApplications(
      user,
      {
        ...input,
        after,
        limit: 100,
      },
      { includeTotal: false },
    );
    yield page.items;
    // Each batch depends on the preceding page's keyset cursor.
    after = page.nextCursor ?? undefined;
  } while (after);
}

export async function exportAdminApplications(
  user: AuthenticatedUser | null,
  input: AdminApplicationExportInput,
  signal: AbortSignal,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationExport,
  );
  requireAnyPermission(actor, [
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.fundingApplicationAllRead,
  ]);
  const filters = adminApplicationExportSchema.parse(input);
  return writeAdminApplicationExport(
    filters.format,
    applicationBatches(actor, filters, signal),
    signal,
  );
}
