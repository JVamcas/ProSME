import "server-only";
import { z } from "zod";
import type { AuthenticatedUser } from "@/auth/types";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { RequestValidationError } from "@/lib/resource-errors";
import { sanitizeFormRichText } from "@/modules/forms/engine/FormRichText";
import { captureApplicationAppealNotifications } from "@/modules/notifications/application/ApplicationAppealNotifications";
import {
  applicationAppealSchema,
  appealAssignmentSchema,
  appealResolutionSchema,
  appealQueueSchema,
} from "../api/ApplicationAppealSchemas";
import {
  appealTransaction,
  findAppealApplication,
  createApplicationAppeal,
  auditApplicationAppeal,
  listApplicationAppeals,
  readApplicationAppeal,
  updateApplicationAppeal,
} from "../infrastructure/ApplicationAppealRepository";
import {
  appealAssigneeCanRead,
  listAppealAssignees,
} from "../infrastructure/ApplicationAppealStaffRepository";

export async function submitApplicationAppeal(values: unknown) {
  const submitted = applicationAppealSchema.parse(values);
  const input = applicationAppealSchema.parse({
    ...submitted,
    grounds: sanitizeFormRichText(submitted.grounds),
    details: sanitizeFormRichText(submitted.details),
  });
  return appealTransaction(async (transaction) => {
    const application = await findAppealApplication(
      transaction,
      input.applicationReference,
    );
    if (!application)
      throw new RequestValidationError(
        "No application was found for this reference.",
      );
    const appeal = await createApplicationAppeal(transaction, application.id, {
      ...input,
      name: application.name,
      email: application.email,
      phone: application.phone,
    });
    await auditApplicationAppeal(transaction, appeal.id, null, "CREATED");
    await captureApplicationAppealNotifications(
      transaction,
      {
        appealId: appeal.id,
        appealReference: appeal.reference,
        applicationId: application.id,
        applicationReference: application.reference,
        occurredAt: new Date().toISOString(),
      },
      { name: application.name, email: application.email },
    );
    return { reference: appeal.reference };
  });
}
export async function getApplicationAppeals(
  user: AuthenticatedUser | null,
  values: unknown,
) {
  requirePermission(user, permissionCodes.applicationAppealReadAll);
  const rows = await listApplicationAppeals(appealQueueSchema.parse(values));
  const items = rows.slice(0, 50);
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > 50 && last
        ? { after: last.updatedAt, afterId: last.id }
        : null,
  };
}
export async function getApplicationAppeal(
  user: AuthenticatedUser | null,
  id: string,
) {
  requirePermission(user, permissionCodes.applicationAppealReadAll);
  return readApplicationAppeal(z.uuid().parse(id));
}
export async function getApplicationAppealAssignees(
  user: AuthenticatedUser | null,
) {
  requirePermission(user, permissionCodes.applicationAppealReadAll);
  requirePermission(user, permissionCodes.applicationAppealAssignAll);
  return listAppealAssignees();
}
export async function assignApplicationAppeal(
  user: AuthenticatedUser | null,
  id: string,
  values: unknown,
) {
  requirePermission(user, permissionCodes.applicationAppealReadAll);
  const actor = requirePermission(
    user,
    permissionCodes.applicationAppealAssignAll,
  );
  const input = appealAssignmentSchema.parse(values);
  const appealId = z.uuid().parse(id);
  return appealTransaction(async (transaction) => {
    if (
      input.assignedTo &&
      !(await appealAssigneeCanRead(transaction, input.assignedTo))
    ) {
      throw new RequestValidationError(
        "Assign only active staff authorized to read application appeals.",
      );
    }
    await updateApplicationAppeal(
      transaction,
      appealId,
      input.expectedRowVersion,
      input,
    );
    await auditApplicationAppeal(transaction, appealId, actor.id, "ASSIGNED", {
      assignedTo: input.assignedTo,
    });
    return { id: appealId };
  });
}
export async function resolveApplicationAppeal(
  user: AuthenticatedUser | null,
  id: string,
  values: unknown,
) {
  requirePermission(user, permissionCodes.applicationAppealReadAll);
  const actor = requirePermission(
    user,
    permissionCodes.applicationAppealResolveAll,
  );
  const input = appealResolutionSchema.parse(values);
  const appealId = z.uuid().parse(id);
  return appealTransaction(async (transaction) => {
    await updateApplicationAppeal(
      transaction,
      appealId,
      input.expectedRowVersion,
      input,
    );
    await auditApplicationAppeal(transaction, appealId, actor.id, "RESOLVED", {
      resolutionNote: input.resolutionNote,
    });
    return { id: appealId };
  });
}
