import "server-only";
import { z } from "zod";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import type { DatabaseTransaction } from "@/platform/database/client";
import {
  ResourceConflictError,
  RequestValidationError,
} from "@/lib/resource-errors";
import {
  readFundingCallKnowledgeSources,
  listFundingCallKnowledgeSources,
} from "@/modules/funding-calls/application/ServerFundingCallKnowledgeService";
import {
  readFaqKnowledgeSources,
  listFaqKnowledgeSources,
} from "@/modules/content/application/ServerFaqKnowledgeService";
import { readEligibilityKnowledgeSources } from "@/modules/eligibility/application/ServerEligibilityKnowledgeService";
import { readContactKnowledgeSource } from "@/modules/content/application/ServerContactKnowledgeService";
import {
  knowledgeApprovalSchema,
  knowledgeSelectionSchema,
  knowledgeSourceQuerySchema,
} from "../api/ChatbotKnowledgeSchemas";
import type {
  KnowledgeSelection,
  KnowledgeSourcePage,
} from "../domain/ChatbotKnowledge";
import { chatbotLimits } from "../domain/ChatbotLimits";
import { knowledgeDiff } from "../engine/KnowledgeDiff";
import { knowledgeFingerprint } from "../infrastructure/KnowledgeFingerprint";
import {
  insertKnowledgeApproval,
  insertPreparedKnowledge,
  knowledgeTransaction,
  readActiveKnowledgeRecords,
  readKnowledgeRelease,
  readKnowledgeWorkspace,
} from "../infrastructure/ChatbotKnowledgeRepository";
import { prepareChatbotKnowledge } from "./PrepareChatbotKnowledge";

function reader(user: AuthenticatedUser | null) {
  return requirePermission(user, permissionCodes.chatbotKnowledgeReadAll);
}

export async function prepareKnowledgeSources(
  selection: KnowledgeSelection,
  transaction: DatabaseTransaction,
) {
  // Source locks use the same order on every preparation/approval transaction.
  // Eligibility reads depend on publication snapshot bindings, never working rows.
  const calls = await readFundingCallKnowledgeSources(
    [
      ...new Set([
        ...selection.fundingCallIds,
        ...(selection.eligibilityCallIds ?? []),
      ]),
    ],
    transaction,
  );
  const faqs = await readFaqKnowledgeSources(selection.faqIds, transaction);
  const contact = selection.contact
    ? await readContactKnowledgeSource(transaction)
    : null;
  const eligibility = await readEligibilityKnowledgeSources(
    [
      ...new Set(
        calls.flatMap((call) =>
          call.eligibilityVersionId ? [call.eligibilityVersionId] : [],
        ),
      ),
    ],
    transaction,
  );
  return prepareChatbotKnowledge(selection, {
    calls,
    faqs,
    eligibility,
    contact,
  });
}

export async function getChatbotKnowledgeWorkspace(
  user: AuthenticatedUser | null,
) {
  reader(user);
  return readKnowledgeWorkspace();
}

export async function getChatbotKnowledgeSources(
  user: AuthenticatedUser | null,
  values: unknown,
): Promise<KnowledgeSourcePage> {
  reader(user);
  const input = knowledgeSourceQuerySchema.parse(values);
  const query = { ...input, limit: chatbotLimits.sourcePageSize };
  const rows =
    input.kind === "faq"
      ? await listFaqKnowledgeSources(query)
      : await listFundingCallKnowledgeSources(query);
  const items = rows.slice(0, chatbotLimits.sourcePageSize);
  return {
    items,
    nextCursor: rows.length > items.length ? items.at(-1)!.id : null,
  };
}

export async function prepareChatbotKnowledgeRelease(
  user: AuthenticatedUser | null,
  values: unknown,
) {
  const actor = requirePermission(
    reader(user),
    permissionCodes.chatbotKnowledgePrepareAll,
  );
  const selection = knowledgeSelectionSchema.parse(values);
  return knowledgeTransaction(async (transaction) => {
    const snapshot = await prepareKnowledgeSources(selection, transaction);
    return insertPreparedKnowledge(
      transaction,
      actor.id,
      snapshot,
      knowledgeFingerprint(snapshot),
    );
  });
}

export async function getChatbotKnowledgeRelease(
  user: AuthenticatedUser | null,
  id: string,
) {
  reader(user);
  const [release, activeRecords] = await Promise.all([
    readKnowledgeRelease(z.uuid().parse(id)),
    readActiveKnowledgeRecords(),
  ]);
  return {
    release,
    changes: knowledgeDiff(activeRecords, release.snapshot.records),
  };
}

export async function approveChatbotKnowledgeRelease(
  user: AuthenticatedUser | null,
  id: string,
  values: unknown,
) {
  const actor = requirePermission(
    reader(user),
    permissionCodes.chatbotKnowledgeApproveAll,
  );
  const releaseId = z.uuid().parse(id);
  const input = knowledgeApprovalSchema.parse(values);
  return knowledgeTransaction(async (transaction) => {
    const release = await readKnowledgeRelease(releaseId, transaction, true);
    if (
      release.contentHash !== input.contentHash ||
      knowledgeFingerprint(release.snapshot) !== input.contentHash
    ) {
      throw new ResourceConflictError(
        "The approval does not match the exact preview. Reload and review the prepared content.",
      );
    }
    if (release.snapshot.issues.length) {
      throw new RequestValidationError(
        "Resolve every preparation issue in the source, then prepare a new release before approval.",
      );
    }
    const current = await prepareKnowledgeSources(
      release.snapshot.selection,
      transaction,
    );
    if (knowledgeFingerprint(current) !== release.contentHash) {
      throw new ResourceConflictError(
        "A public source or its eligibility dependencies changed. Prepare and review a replacement release.",
      );
    }
    if (release.status === "APPROVED") return release;
    return insertKnowledgeApproval(transaction, actor.id, release);
  });
}
