import "server-only";

import { and, desc, eq, inArray, max } from "drizzle-orm";

import { getDatabase, type DatabaseTransaction } from "@/db/client";
import { applications } from "@/db/schema/applications";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
import type {
  EligibilityIntegrationBindingInput,
  EligibilityIntegrationCreateInput,
  EligibilityIntegrationVersionCreateInput,
} from "../api/EligibilityIntegrationSchemas";
import type {
  EligibilityIntegrationBinding,
  EligibilityIntegrationExecutionResult,
} from "../domain/EligibilityIntegration";
import {
  eligibilityIntegrationDefinitions,
  eligibilityIntegrationExecutions,
  eligibilityIntegrationVersions,
  fundingCallEligibilityIntegrationBindings,
} from "./eligibility-integration.schema";

type Database = ReturnType<typeof getDatabase> | DatabaseTransaction;

function versionProjection() {
  return {
    definitionId: eligibilityIntegrationVersions.definitionId,
    id: eligibilityIntegrationVersions.id,
    outputSchema: eligibilityIntegrationVersions.outputSchema,
    rawResponsePolicy: eligibilityIntegrationVersions.rawResponsePolicy,
    retryPolicy: eligibilityIntegrationVersions.retryPolicy,
    status: eligibilityIntegrationVersions.status,
    versionNumber: eligibilityIntegrationVersions.versionNumber,
  };
}

export async function createEligibilityIntegration(
  actorId: string,
  input: EligibilityIntegrationCreateInput,
) {
  return getDatabase().transaction(async (transaction) => {
    const [definition] = await transaction.insert(
      eligibilityIntegrationDefinitions,
    ).values({
      ...input.definition,
      createdBy: actorId,
    }).returning();
    const [version] = await transaction.insert(
      eligibilityIntegrationVersions,
    ).values({
      ...input.version,
      createdBy: actorId,
      definitionId: definition!.id,
      versionNumber: 1,
    }).returning(versionProjection());
    return { definition: definition!, version: version! };
  });
}

export async function createEligibilityIntegrationVersion(
  actorId: string,
  definitionId: string,
  input: EligibilityIntegrationVersionCreateInput,
) {
  return getDatabase().transaction(async (transaction) => {
    const [definition] = await transaction.select({
      id: eligibilityIntegrationDefinitions.id,
    }).from(eligibilityIntegrationDefinitions).where(eq(
      eligibilityIntegrationDefinitions.id,
      definitionId,
    )).for("update");
    if (!definition) return null;
    const [sequence] = await transaction.select({
      versionNumber: max(eligibilityIntegrationVersions.versionNumber),
    }).from(eligibilityIntegrationVersions).where(eq(
      eligibilityIntegrationVersions.definitionId,
      definitionId,
    ));
    const [version] = await transaction.insert(
      eligibilityIntegrationVersions,
    ).values({
      ...input,
      createdBy: actorId,
      definitionId,
      versionNumber: (sequence?.versionNumber ?? 0) + 1,
    }).returning(versionProjection());
    return version!;
  });
}

export async function publishEligibilityIntegrationVersion(
  actorId: string,
  versionId: string,
) {
  const [version] = await getDatabase().update(eligibilityIntegrationVersions)
    .set({
      publishedAt: new Date(),
      publishedBy: actorId,
      status: "PUBLISHED",
    })
    .where(and(
      eq(eligibilityIntegrationVersions.id, versionId),
      eq(eligibilityIntegrationVersions.status, "DRAFT"),
    ))
    .returning(versionProjection());
  return version ?? null;
}

export async function readEligibilityIntegrationVersion(
  versionId: string,
  database: Database = getDatabase(),
) {
  const [version] = await database.select(versionProjection())
    .from(eligibilityIntegrationVersions)
    .where(eq(eligibilityIntegrationVersions.id, versionId));
  return version ?? null;
}

export async function readEligibilityIntegrationCatalogue() {
  return getDatabase().select({
    definition: {
      description: eligibilityIntegrationDefinitions.description,
      id: eligibilityIntegrationDefinitions.id,
      name: eligibilityIntegrationDefinitions.name,
      stableKey: eligibilityIntegrationDefinitions.stableKey,
    },
    version: versionProjection(),
  }).from(eligibilityIntegrationDefinitions).innerJoin(
    eligibilityIntegrationVersions,
    eq(
      eligibilityIntegrationVersions.definitionId,
      eligibilityIntegrationDefinitions.id,
    ),
  ).orderBy(
    eligibilityIntegrationDefinitions.name,
    desc(eligibilityIntegrationVersions.versionNumber),
  );
}

export async function bindEligibilityIntegration(
  actorId: string,
  fundingCallId: string,
  input: EligibilityIntegrationBindingInput,
) {
  return getDatabase().transaction(async (transaction) => {
    const [target] = await transaction.select({
      fundingCallId: fundingCalls.id,
      fundingCallStatus: fundingCalls.status,
      integrationVersion: versionProjection(),
      workflowTemplateVersionId: fundingCalls.workflowTemplateVersionId,
    }).from(fundingCalls).innerJoin(
      eligibilityIntegrationVersions,
      eq(eligibilityIntegrationVersions.id, input.integrationVersionId),
    ).where(eq(fundingCalls.id, fundingCallId));
    if (!target) return { kind: "NOT_FOUND" } as const;
    if (
      target.fundingCallStatus !== "DRAFT"
      || !target.workflowTemplateVersionId
      || target.integrationVersion.status !== "PUBLISHED"
    ) {
      return { kind: "NOT_BINDABLE" } as const;
    }
    const [binding] = await transaction.insert(
      fundingCallEligibilityIntegrationBindings,
    ).values({
      createdBy: actorId,
      fundingCallId,
      integrationVersionId: input.integrationVersionId,
      manualFallbackAllowed: input.manualFallbackAllowed,
      providerAdapterKey: input.providerAdapterKey,
      providerDisplayName: input.providerDisplayName,
      secretReference: input.secretReference,
      workflowTemplateVersionId: target.workflowTemplateVersionId,
    }).onConflictDoUpdate({
      set: {
        manualFallbackAllowed: input.manualFallbackAllowed,
        providerAdapterKey: input.providerAdapterKey,
        providerDisplayName: input.providerDisplayName,
        secretReference: input.secretReference,
      },
      target: [
        fundingCallEligibilityIntegrationBindings.fundingCallId,
        fundingCallEligibilityIntegrationBindings.integrationVersionId,
      ],
    }).returning();
    return {
      binding: binding!,
      kind: "BOUND",
      version: target.integrationVersion,
    } as const;
  });
}

export async function readEligibilityIntegrationSources(
  fundingCallIds: readonly string[],
) {
  if (!fundingCallIds.length) return [];
  const rows = await getDatabase().select({
    fundingCallId: fundingCallEligibilityIntegrationBindings.fundingCallId,
    integrationVersionId: eligibilityIntegrationVersions.id,
    outputSchema: eligibilityIntegrationVersions.outputSchema,
    providerDisplayName:
      fundingCallEligibilityIntegrationBindings.providerDisplayName,
  }).from(fundingCallEligibilityIntegrationBindings).innerJoin(
    eligibilityIntegrationVersions,
    eq(
      eligibilityIntegrationVersions.id,
      fundingCallEligibilityIntegrationBindings.integrationVersionId,
    ),
  ).innerJoin(
    fundingCalls,
    and(
      eq(
        fundingCalls.id,
        fundingCallEligibilityIntegrationBindings.fundingCallId,
      ),
      eq(
        fundingCalls.workflowTemplateVersionId,
        fundingCallEligibilityIntegrationBindings.workflowTemplateVersionId,
      ),
    ),
  ).where(and(
    inArray(
      fundingCallEligibilityIntegrationBindings.fundingCallId,
      [...fundingCallIds],
    ),
    eq(eligibilityIntegrationVersions.status, "PUBLISHED"),
  ));
  return rows.flatMap((row) => row.outputSchema
    .filter((output) => output.eligibleForScreening)
    .map((output) => ({
      fundingCallId: row.fundingCallId,
      integrationVersionId: row.integrationVersionId,
      label: `${row.providerDisplayName}: ${output.label}`,
      output,
    })));
}

export async function readApplicationIntegrationBinding(
  applicationId: string,
  bindingId: string,
  database: Database = getDatabase(),
): Promise<EligibilityIntegrationBinding | null> {
  const [row] = await database.select({
    fundingCallId: fundingCallEligibilityIntegrationBindings.fundingCallId,
    id: fundingCallEligibilityIntegrationBindings.id,
    integrationVersion: versionProjection(),
    manualFallbackAllowed:
      fundingCallEligibilityIntegrationBindings.manualFallbackAllowed,
    providerAdapterKey:
      fundingCallEligibilityIntegrationBindings.providerAdapterKey,
    providerDisplayName:
      fundingCallEligibilityIntegrationBindings.providerDisplayName,
    secretReference: fundingCallEligibilityIntegrationBindings.secretReference,
    workflowTemplateVersionId:
      fundingCallEligibilityIntegrationBindings.workflowTemplateVersionId,
  }).from(fundingCallEligibilityIntegrationBindings).innerJoin(
    eligibilityIntegrationVersions,
    eq(
      eligibilityIntegrationVersions.id,
      fundingCallEligibilityIntegrationBindings.integrationVersionId,
    ),
  ).innerJoin(
    applications,
    and(
      eq(applications.id, applicationId),
      eq(
        applications.fundingOpportunityId,
        fundingCallEligibilityIntegrationBindings.fundingCallId,
      ),
      eq(
        applications.workflowVersionId,
        fundingCallEligibilityIntegrationBindings.workflowTemplateVersionId,
      ),
    ),
  ).where(eq(fundingCallEligibilityIntegrationBindings.id, bindingId));
  return row ?? null;
}

export async function insertEligibilityIntegrationExecution(input: {
  actorId?: string;
  applicationId: string;
  binding: EligibilityIntegrationBinding;
  evidenceReference?: string;
  executionSource: "MANUAL" | "PROVIDER";
  executedAt: Date;
  result: EligibilityIntegrationExecutionResult;
}) {
  const retentionDays = input.binding.integrationVersion.rawResponsePolicy.kind
      === "RETAIN"
    ? input.binding.integrationVersion.rawResponsePolicy.retentionDays
    : null;
  const rawResponseExpiresAt = retentionDays === null
    ? null
    : new Date(input.executedAt.getTime() + retentionDays * 86_400_000);
  const [execution] = await getDatabase().insert(
    eligibilityIntegrationExecutions,
  ).values({
    applicationId: input.applicationId,
    attemptCount: input.result.attemptCount,
    bindingId: input.binding.id,
    evidenceReference: input.evidenceReference,
    executedAt: input.executedAt,
    executedBy: input.actorId,
    executionSource: input.executionSource,
    failureMessage: input.result.failureMessage,
    normalizedOutputs: { ...input.result.normalizedOutputs },
    rawResponse: input.result.rawResponse,
    rawResponseExpiresAt,
    status: input.result.status,
  }).returning();
  return execution!;
}

export async function readLatestEligibilityIntegrationExecutions(
  applicationId: string,
  integrationVersionIds: readonly string[],
  database: DatabaseTransaction,
) {
  if (!integrationVersionIds.length) return [];
  const rows = await database.select({
    bindingId: eligibilityIntegrationExecutions.bindingId,
    executedAt: eligibilityIntegrationExecutions.executedAt,
    executionId: eligibilityIntegrationExecutions.id,
    failureMessage: eligibilityIntegrationExecutions.failureMessage,
    integrationVersionId:
      fundingCallEligibilityIntegrationBindings.integrationVersionId,
    normalizedOutputs: eligibilityIntegrationExecutions.normalizedOutputs,
    status: eligibilityIntegrationExecutions.status,
  }).from(eligibilityIntegrationExecutions).innerJoin(
    fundingCallEligibilityIntegrationBindings,
    eq(
      fundingCallEligibilityIntegrationBindings.id,
      eligibilityIntegrationExecutions.bindingId,
    ),
  ).where(and(
    eq(eligibilityIntegrationExecutions.applicationId, applicationId),
    inArray(
      fundingCallEligibilityIntegrationBindings.integrationVersionId,
      [...integrationVersionIds],
    ),
  )).orderBy(
    desc(eligibilityIntegrationExecutions.executedAt),
    desc(eligibilityIntegrationExecutions.id),
  );
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.integrationVersionId)) return false;
    seen.add(row.integrationVersionId);
    return true;
  });
}
