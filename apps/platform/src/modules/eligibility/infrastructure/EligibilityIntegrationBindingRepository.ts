import "server-only";

import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { getDatabase, type DatabaseTransaction } from "@/db/client";
import { applications } from "@/modules/applications/infrastructure/application.schema";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
import { readWorkingFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallVersionRepository";
import { workflowInstances } from "@/modules/workflows/infrastructure/workflow-runtime.schema";
import type { EligibilityIntegrationBindingInput } from "../api/EligibilityIntegrationSchemas";
import type { EligibilityIntegrationBinding } from "../domain/EligibilityIntegration";
import { versionProjection } from "./EligibilityIntegrationRepository";
import {
  eligibilityIntegrationVersions,
  fundingCallEligibilityIntegrationBindings,
  fundingCallVersionIntegrationBindings,
} from "./eligibility-integration.schema";

type Database = ReturnType<typeof getDatabase> | DatabaseTransaction;

export async function bindEligibilityIntegration(
  actorId: string,
  fundingCallId: string,
  input: EligibilityIntegrationBindingInput,
) {
  return getDatabase().transaction(async (transaction) => {
    const [effective] = await transaction
      .select()
      .from(fundingCalls)
      .where(eq(fundingCalls.id, fundingCallId))
      .for("update")
      .limit(1);
    if (!effective) return { kind: "NOT_FOUND" } as const;
    const [{ call, draft }, versions] = await Promise.all([
      readWorkingFundingCall(transaction, effective),
      transaction
        .select(versionProjection())
        .from(eligibilityIntegrationVersions)
        .where(
          eq(eligibilityIntegrationVersions.id, input.integrationVersionId),
        )
        .limit(1),
    ]);
    const version = versions[0];
    if (!version) return { kind: "NOT_FOUND" } as const;
    if (
      call.status !== "DRAFT" ||
      !call.workflowTemplateVersionId ||
      version.status !== "PUBLISHED"
    ) {
      return { kind: "NOT_BINDABLE" } as const;
    }
    const [existing] = await transaction
      .select({ id: fundingCallEligibilityIntegrationBindings.id })
      .from(fundingCallEligibilityIntegrationBindings)
      .leftJoin(
        fundingCallVersionIntegrationBindings,
        eq(
          fundingCallVersionIntegrationBindings.bindingId,
          fundingCallEligibilityIntegrationBindings.id,
        ),
      )
      .where(
        and(
          eq(
            fundingCallEligibilityIntegrationBindings.fundingCallId,
            fundingCallId,
          ),
          eq(
            fundingCallEligibilityIntegrationBindings.integrationVersionId,
            input.integrationVersionId,
          ),
          draft
            ? eq(
                fundingCallVersionIntegrationBindings.fundingCallVersionId,
                draft.id,
              )
            : isNull(fundingCallVersionIntegrationBindings.bindingId),
        ),
      )
      .limit(1);
    const values = {
      ...input,
      workflowTemplateVersionId: call.workflowTemplateVersionId,
    };
    const [binding] = existing
      ? await transaction
          .update(fundingCallEligibilityIntegrationBindings)
          .set(values)
          .where(eq(fundingCallEligibilityIntegrationBindings.id, existing.id))
          .returning()
      : await transaction
          .insert(fundingCallEligibilityIntegrationBindings)
          .values({ ...values, createdBy: actorId, fundingCallId })
          .returning();
    if (draft && !existing) {
      await transaction.insert(fundingCallVersionIntegrationBindings).values({
        bindingId: binding.id,
        fundingCallId,
        fundingCallVersionId: draft.id,
        integrationVersionId: version.id,
      });
    }
    await transaction
      .update(fundingCalls)
      .set({ rowVersion: effective.rowVersion + 1 })
      .where(eq(fundingCalls.id, fundingCallId));
    return { binding, kind: "BOUND", version } as const;
  });
}

export type EligibilityIntegrationSourceContext = {
  id: string;
  workflowTemplateVersionId: string | null;
  currentPublishedVersionId?: string | null;
  draftVersionId?: string | null;
};

export async function readEligibilityIntegrationSources(
  calls: readonly EligibilityIntegrationSourceContext[],
) {
  if (!calls.length) return [];
  const rows = await getDatabase()
    .select({
      fundingCallId: fundingCallEligibilityIntegrationBindings.fundingCallId,
      integrationVersionId: eligibilityIntegrationVersions.id,
      outputSchema: eligibilityIntegrationVersions.outputSchema,
      providerDisplayName:
        fundingCallEligibilityIntegrationBindings.providerDisplayName,
    })
    .from(fundingCallEligibilityIntegrationBindings)
    .innerJoin(
      eligibilityIntegrationVersions,
      eq(
        eligibilityIntegrationVersions.id,
        fundingCallEligibilityIntegrationBindings.integrationVersionId,
      ),
    )
    .leftJoin(
      fundingCallVersionIntegrationBindings,
      eq(
        fundingCallVersionIntegrationBindings.bindingId,
        fundingCallEligibilityIntegrationBindings.id,
      ),
    )
    .where(
      and(
        inArray(eligibilityIntegrationVersions.status, [
          "PUBLISHED",
          "RETIRED",
        ]),
        or(
          ...calls.map((call) => {
            const versionId =
              call.draftVersionId ?? call.currentPublishedVersionId;
            return and(
              eq(
                fundingCallEligibilityIntegrationBindings.fundingCallId,
                call.id,
              ),
              eq(
                fundingCallEligibilityIntegrationBindings.workflowTemplateVersionId,
                call.workflowTemplateVersionId ??
                  "00000000-0000-0000-0000-000000000000",
              ),
              versionId
                ? eq(
                    fundingCallVersionIntegrationBindings.fundingCallVersionId,
                    versionId,
                  )
                : isNull(fundingCallVersionIntegrationBindings.bindingId),
            );
          }),
        ),
      ),
    );
  return rows.flatMap((row) =>
    row.outputSchema
      .filter((output) => output.eligibleForScreening)
      .map((output) => ({
        fundingCallId: row.fundingCallId,
        integrationVersionId: row.integrationVersionId,
        label: `${row.providerDisplayName}: ${output.label}`,
        output,
      })),
  );
}

export async function readApplicationIntegrationBinding(
  applicationId: string,
  bindingId: string,
  database: Database = getDatabase(),
): Promise<EligibilityIntegrationBinding | null> {
  const [row] = await database
    .select({
      fundingCallId: fundingCallEligibilityIntegrationBindings.fundingCallId,
      id: fundingCallEligibilityIntegrationBindings.id,
      integrationVersion: versionProjection(),
      manualFallbackAllowed:
        fundingCallEligibilityIntegrationBindings.manualFallbackAllowed,
      providerAdapterKey:
        fundingCallEligibilityIntegrationBindings.providerAdapterKey,
      providerDisplayName:
        fundingCallEligibilityIntegrationBindings.providerDisplayName,
      secretReference:
        fundingCallEligibilityIntegrationBindings.secretReference,
      workflowTemplateVersionId:
        fundingCallEligibilityIntegrationBindings.workflowTemplateVersionId,
    })
    .from(fundingCallEligibilityIntegrationBindings)
    .innerJoin(
      eligibilityIntegrationVersions,
      eq(
        eligibilityIntegrationVersions.id,
        fundingCallEligibilityIntegrationBindings.integrationVersionId,
      ),
    )
    .innerJoin(
      applications,
      and(
        eq(applications.id, applicationId),
        eq(
          applications.fundingOpportunityId,
          fundingCallEligibilityIntegrationBindings.fundingCallId,
        ),
      ),
    )
    .innerJoin(
      fundingCallVersionIntegrationBindings,
      and(
        eq(
          fundingCallVersionIntegrationBindings.bindingId,
          fundingCallEligibilityIntegrationBindings.id,
        ),
        eq(
          fundingCallVersionIntegrationBindings.fundingCallVersionId,
          applications.fundingCallVersionId,
        ),
      ),
    )
    .innerJoin(
      workflowInstances,
      and(
        eq(workflowInstances.applicationId, applications.id),
        eq(
          workflowInstances.workflowTemplateVersionId,
          fundingCallEligibilityIntegrationBindings.workflowTemplateVersionId,
        ),
      ),
    )
    .where(eq(fundingCallEligibilityIntegrationBindings.id, bindingId));
  return row ?? null;
}
