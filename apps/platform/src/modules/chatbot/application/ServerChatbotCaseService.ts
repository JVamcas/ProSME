import "server-only";
import { z } from "zod";
import {
  can,
  requireAnyPermission,
  requirePermission,
} from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { RequestValidationError } from "@/lib/resource-errors";
import {
  chatbotCaseAssignmentSchema,
  chatbotCaseQuerySchema,
  chatbotCaseUpdateSchema,
} from "../api/ChatbotConversationSchemas";
import { knowledgeTransaction } from "../infrastructure/ChatbotKnowledgeRepository";
import {
  auditChatbotCaseAccess,
  listChatbotCases,
  readChatbotCaseAssignment,
  readChatbotCaseHistory,
  updateChatbotCase,
} from "../infrastructure/ChatbotCaseRepository";
import {
  chatbotAssigneeCanRead,
  listChatbotAssignableStaff,
} from "../infrastructure/ChatbotPolicyRepository";
import { requireChatbotEscalationAccess } from "./ChatbotEscalationAccess";

const readPermissions = [
  permissionCodes.chatbotEscalationReadAll,
  permissionCodes.chatbotEscalationReadAssigned,
];
export async function getChatbotCases(
  user: AuthenticatedUser | null,
  values: unknown,
) {
  const actor = requireAnyPermission(user, readPermissions);
  const query = chatbotCaseQuerySchema.parse(values);
  const all =
    query.scope === "all" ||
    (query.scope === undefined &&
      can(actor, permissionCodes.chatbotEscalationReadAll));
  if (all) requirePermission(actor, permissionCodes.chatbotEscalationReadAll);
  return knowledgeTransaction(async (transaction) => {
    const rows = await listChatbotCases(
      transaction,
      actor.id,
      all,
      query,
    );
    await auditChatbotCaseAccess(transaction, actor.id, null, "QUEUE_READ");
    const items = rows.slice(0, 50);
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        rows.length > 50 && last
          ? { after: last.updatedAt, afterId: last.id }
          : null,
    };
  });
}

export async function getChatbotCase(
  user: AuthenticatedUser | null,
  id: string,
) {
  requireAnyPermission(user, readPermissions);
  return knowledgeTransaction(async (transaction) => {
    const caseId = z.uuid().parse(id);
    const assignment = await readChatbotCaseAssignment(transaction, caseId);
    const actor = requireChatbotEscalationAccess(user, assignment, "read");
    await auditChatbotCaseAccess(transaction, actor.id, caseId, "HISTORY_READ");
    return readChatbotCaseHistory(transaction, caseId);
  });
}

export async function saveChatbotCaseState(
  user: AuthenticatedUser | null,
  id: string,
  values: unknown,
) {
  requireAnyPermission(user, readPermissions);
  requireAnyPermission(user, [
    permissionCodes.chatbotEscalationResolveAll,
    permissionCodes.chatbotEscalationResolveAssigned,
  ]);
  const input = chatbotCaseUpdateSchema.parse(values);
  return knowledgeTransaction(async (transaction) => {
    const caseId = z.uuid().parse(id);
    const assignment = await readChatbotCaseAssignment(transaction, caseId);
    requireChatbotEscalationAccess(user, assignment, "read");
    const actor = requireChatbotEscalationAccess(user, assignment, "resolve");
    await updateChatbotCase(
      transaction,
      caseId,
      input.expectedRowVersion,
      input,
    );
    await auditChatbotCaseAccess(
      transaction,
      actor.id,
      caseId,
      "STATE_UPDATED",
    );
    return readChatbotCaseHistory(transaction, caseId);
  });
}

export async function getChatbotCaseAssignees(user: AuthenticatedUser | null) {
  requirePermission(user, permissionCodes.chatbotEscalationAssignAll);
  return (await listChatbotAssignableStaff()).slice(0, 500);
}

export async function assignChatbotCase(
  user: AuthenticatedUser | null,
  id: string,
  values: unknown,
) {
  const actor = requirePermission(
    requireAnyPermission(user, readPermissions),
    permissionCodes.chatbotEscalationAssignAll,
  );
  const input = chatbotCaseAssignmentSchema.parse(values);
  return knowledgeTransaction(async (transaction) => {
    const caseId = z.uuid().parse(id);
    const assignment = await readChatbotCaseAssignment(transaction, caseId);
    requireChatbotEscalationAccess(actor, assignment, "read");
    if (
      input.assignedTo &&
      !(await chatbotAssigneeCanRead(input.assignedTo, transaction))
    )
      throw new RequestValidationError(
        "Assign only active staff authorized to read support cases.",
      );
    await updateChatbotCase(
      transaction,
      caseId,
      input.expectedRowVersion,
      input,
    );
    await auditChatbotCaseAccess(transaction, actor.id, caseId, "ASSIGNED");
    // An assigned-scope actor can lose access through reassignment; return no history.
    return { id: caseId };
  });
}
