import "server-only";

import { and, desc, eq, or } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { businessProfiles } from "@/db/schema/profiles";
import { eligibilityRuleSetVersions } from "@/modules/eligibility/infrastructure/eligibility-ruleset.schema";
import { formVersions } from "@/modules/forms/infrastructure/form.schema";
import {
  fundingCallPublicationRevisions,
  fundingCalls,
} from "@/modules/funding-calls/infrastructure/funding-call.schema";
import {
  applicationAuditEntries,
  applicationCommands,
  applicationDraftResponses,
  applications,
} from "./application.schema";
import {
  applicationCommandMatches,
  type ApplicationTransaction,
  findApplicationCommand,
} from "./ApplicationCommandRepository";

type CreateDraftInput = {
  actorUserId: string;
  businessId?: string;
  correlationId: string;
  fundingCallIdOrSlug: string;
  idempotencyKey: string;
  requestFingerprint: string;
};

export type CreateDraftResult =
  | { applicationId: string; kind: "created" | "replayed" }
  | {
      kind:
        | "business_required"
        | "duplicate"
        | "idempotency_conflict"
        | "unavailable"
        | "unowned_business";
    };

async function lockFundingCall(
  transaction: ApplicationTransaction,
  identifier: string,
) {
  const identifierFilter = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(identifier)
    ? or(eq(fundingCalls.id, identifier), eq(fundingCalls.slug, identifier))
    : eq(fundingCalls.slug, identifier);
  const [call] = await transaction
    .select()
    .from(fundingCalls)
    .where(identifierFilter)
    .for("update")
    .limit(1);
  return call ?? null;
}

async function readPublishedBinding(
  transaction: ApplicationTransaction,
  fundingCallId: string,
) {
  const [revision] = await transaction
    .select({ snapshot: fundingCallPublicationRevisions.snapshot })
    .from(fundingCallPublicationRevisions)
    .where(eq(fundingCallPublicationRevisions.fundingCallId, fundingCallId))
    .orderBy(desc(fundingCallPublicationRevisions.revisionNumber))
    .limit(1);
  return revision?.snapshot ?? null;
}

async function bindingIsPublished(
  transaction: ApplicationTransaction,
  formVersionId: string,
  eligibilityRuleSetVersionId: string,
) {
  const [form] = await transaction
    .select({ status: formVersions.status })
    .from(formVersions)
    .where(eq(formVersions.id, formVersionId))
    .limit(1);
  const [rules] = await transaction
    .select({ status: eligibilityRuleSetVersions.status })
    .from(eligibilityRuleSetVersions)
    .where(eq(eligibilityRuleSetVersions.id, eligibilityRuleSetVersionId))
    .limit(1);
  return form?.status === "PUBLISHED" && rules?.status === "PUBLISHED";
}

async function businessIsOwned(
  transaction: ApplicationTransaction,
  actorUserId: string,
  businessId: string,
) {
  const [business] = await transaction
    .select({ id: businessProfiles.id })
    .from(businessProfiles)
    .where(and(
      eq(businessProfiles.id, businessId),
      eq(businessProfiles.userId, actorUserId),
    ))
    .limit(1);
  return Boolean(business);
}

async function hasDuplicate(
  transaction: ApplicationTransaction,
  input: CreateDraftInput,
  fundingCallId: string,
  policy: "none" | "one_per_applicant" | "one_per_business",
) {
  if (policy === "none") return false;
  const scope = policy === "one_per_applicant"
    ? eq(applications.ownerUserId, input.actorUserId)
    : eq(applications.businessId, input.businessId!);
  const [duplicate] = await transaction
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.fundingOpportunityId, fundingCallId), scope))
    .limit(1);
  return Boolean(duplicate);
}

async function createDraftInTransaction(
  transaction: ApplicationTransaction,
  input: CreateDraftInput,
): Promise<CreateDraftResult> {
  const initialReplay = await findApplicationCommand(
    transaction,
    input.actorUserId,
    input.idempotencyKey,
  );
  if (initialReplay) {
    return applicationCommandMatches(
      initialReplay,
      "CREATE_DRAFT",
      input.requestFingerprint,
    )
      ? { applicationId: initialReplay.applicationId, kind: "replayed" }
      : { kind: "idempotency_conflict" };
  }
  const call = await lockFundingCall(transaction, input.fundingCallIdOrSlug);
  const now = new Date();
  if (
    !call
    || !["LIVE", "SCHEDULED"].includes(call.status)
    || now < call.opensAt
    || now >= call.closesAt
  ) {
    return { kind: "unavailable" };
  }
  const replay = await findApplicationCommand(
    transaction,
    input.actorUserId,
    input.idempotencyKey,
  );
  if (replay) {
    return applicationCommandMatches(
      replay,
      "CREATE_DRAFT",
      input.requestFingerprint,
    )
      ? { applicationId: replay.applicationId, kind: "replayed" }
      : { kind: "idempotency_conflict" };
  }
  const binding = await readPublishedBinding(transaction, call.id);
  const formVersionId = binding?.formVersionId;
  const rulesVersionId = binding?.eligibilityRuleSetVersionId;
  const duplicatePolicy = binding?.applicationDuplicatePolicy;
  if (
    !binding
    || !formVersionId
    || !rulesVersionId
    || !["none", "one_per_applicant", "one_per_business"].includes(
      duplicatePolicy ?? "",
    )
    || !await bindingIsPublished(transaction, formVersionId, rulesVersionId)
  ) {
    return { kind: "unavailable" };
  }
  if (duplicatePolicy === "one_per_business") {
    if (!input.businessId) return { kind: "business_required" };
  }
  if (
    input.businessId
    && !await businessIsOwned(transaction, input.actorUserId, input.businessId)
  ) {
    return { kind: "unowned_business" };
  }
  if (await hasDuplicate(
    transaction,
    input,
    call.id,
    duplicatePolicy!,
  )) {
    return { kind: "duplicate" };
  }
  const [application] = await transaction
    .insert(applications)
    .values({
      businessId: input.businessId,
      duplicatePolicy: duplicatePolicy!,
      eligibilityRuleSetVersionId: rulesVersionId,
      formVersionId,
      fundingOpportunityId: call.id,
      fundingOpportunityTitle: binding.title,
      ownerUserId: input.actorUserId,
    })
    .returning({ id: applications.id, rowVersion: applications.rowVersion });
  const [response] = await transaction
    .insert(applicationDraftResponses)
    .values({
      applicationId: application.id,
      formVersionId,
      respondentUserId: input.actorUserId,
      values: {},
    })
    .returning({ id: applicationDraftResponses.id });
  await transaction
    .update(applications)
    .set({
      latestDraftResponseId: response.id,
      rowVersion: application.rowVersion + 1,
      updatedAt: now,
    })
    .where(eq(applications.id, application.id));
  await transaction.insert(applicationCommands).values({
    actorUserId: input.actorUserId,
    applicationId: application.id,
    commandType: "CREATE_DRAFT",
    idempotencyKey: input.idempotencyKey,
    requestFingerprint: input.requestFingerprint,
  });
  await transaction.insert(applicationAuditEntries).values({
    action: "APPLICATION_DRAFT_CREATED",
    actorUserId: input.actorUserId,
    applicationId: application.id,
    correlationId: input.correlationId,
    metadata: {
      businessId: input.businessId ?? null,
      eligibilityRuleSetVersionId: rulesVersionId,
      formVersionId,
      fundingCallId: call.id,
    },
  });
  return { applicationId: application.id, kind: "created" };
}

export function createApplicationDraft(input: CreateDraftInput) {
  return getDatabase().transaction((transaction) =>
    createDraftInTransaction(transaction, input),
  );
}
