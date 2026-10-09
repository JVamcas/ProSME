import "server-only";

import { and, eq, sql } from "drizzle-orm";
import {
  applications,
  applicationSubmissionSnapshots,
  authoritativeEligibilityOutcomes,
  fundingCalls,
  workflowInstances,
  workflowStageDefinitions,
} from "@/db/schema";
import { workflowHasActiveApplicationHold } from "./WorkflowHoldQueries";
import type {
  StageActivationTarget,
  StageActivationTransaction,
} from "./StageActivationRepository";

export async function lockStageActivationTarget(
  transaction: StageActivationTransaction,
  workflowInstanceId: string,
  stageDefinitionId: string,
): Promise<StageActivationTarget | null> {
  const [row] = await transaction
    .select({
      applicationId: applications.id,
      snapshotContent: applicationSubmissionSnapshots.snapshotContent,
      effectiveFundingCall: {
        opensAt: fundingCalls.opensAt,
        closesAt: fundingCalls.closesAt,
        status: fundingCalls.status,
      },
      eligibility: {
        eligible: authoritativeEligibilityOutcomes.eligible,
        evaluatedAt: authoritativeEligibilityOutcomes.evaluatedAt,
        outcome: authoritativeEligibilityOutcomes.finalOutcome,
        hardFailureCount: sql<number>`jsonb_array_length(${authoritativeEligibilityOutcomes.hardFailures})`,
        manualScreeningRequired:
          authoritativeEligibilityOutcomes.manualScreeningRequired,
        ruleSetVersionId: authoritativeEligibilityOutcomes.ruleSetVersionId,
        ruleSetVersionNumber:
          authoritativeEligibilityOutcomes.ruleSetVersionNumber,
        softFailureCount: sql<number>`jsonb_array_length(${authoritativeEligibilityOutcomes.softFailures})`,
        warningCount: sql<number>`jsonb_array_length(${authoritativeEligibilityOutcomes.warnings})`,
      },
      entryCondition: workflowStageDefinitions.entryCondition,
      joinPredecessorStageKeys: sql<string[]>`ARRAY(
        SELECT predecessor.code
        FROM app_workflow_stage_join_predecessors dependency
        JOIN app_workflow_stage_definitions predecessor
          ON predecessor.id = dependency.predecessor_stage_id
        WHERE dependency.stage_id = ${workflowStageDefinitions.id}
        ORDER BY predecessor.code
      )`,
      publicStatus: {
        status: workflowStageDefinitions.applicantStatus,
        label: workflowStageDefinitions.applicantLabel,
        description: workflowStageDefinitions.applicantDescription,
      },
      repeatable: workflowStageDefinitions.repeatable,
      slaHours: workflowStageDefinitions.slaHours,
      stageDefinitionId: workflowStageDefinitions.id,
      stageKey: workflowStageDefinitions.code,
      stageName: workflowStageDefinitions.name,
      workflowInstanceId: workflowInstances.id,
    })
    .from(workflowInstances)
    .innerJoin(
      applications,
      eq(applications.id, workflowInstances.applicationId),
    )
    .innerJoin(
      fundingCalls,
      eq(fundingCalls.id, applications.fundingOpportunityId),
    )
    .innerJoin(
      applicationSubmissionSnapshots,
      eq(applicationSubmissionSnapshots.id, applications.submissionSnapshotId),
    )
    .leftJoin(
      authoritativeEligibilityOutcomes,
      and(
        eq(authoritativeEligibilityOutcomes.applicationId, applications.id),
        sql`${authoritativeEligibilityOutcomes.evaluationNumber} = (
          SELECT max(latest.evaluation_number)
          FROM app_authoritative_eligibility_outcomes latest
          WHERE latest.application_id = ${applications.id}
        )`,
      ),
    )
    .innerJoin(
      workflowStageDefinitions,
      and(
        eq(workflowStageDefinitions.id, stageDefinitionId),
        eq(
          workflowStageDefinitions.versionId,
          workflowInstances.workflowTemplateVersionId,
        ),
        eq(workflowStageDefinitions.enabled, true),
      ),
    )
    .where(
      and(
        eq(workflowInstances.id, workflowInstanceId),
        eq(workflowInstances.status, "ACTIVE"),
      ),
    )
    .for("update", { of: workflowInstances })
    .limit(1);

  if (!row) return null;
  const paused = await transaction.execute<{ paused: boolean }>(sql`
    SELECT ${workflowHasActiveApplicationHold(sql`${workflowInstanceId}::uuid`)} AS paused
  `);
  if (paused.rows[0]?.paused) return null;
  const content = row.snapshotContent;
  const application = content.application;
  const fundingCall = content.fundingCall;
  const terms = fundingCall.terms as Record<string, unknown>;
  const {
    snapshotContent: _snapshotContent,
    effectiveFundingCall,
    ...target
  } = row;
  void _snapshotContent;
  return {
    ...target,
    applicationReference: content.reference,
    application: {
      ...application,
      ...content.form.normalizedValues,
      ...(application.businessSection as Record<string, unknown>),
      ...(application.projectSection as Record<string, unknown>),
      ...(application.financialSection as Record<string, unknown>),
      ...(application.declarationsSection as Record<string, unknown>),
      reference: content.reference,
      submittedAt: content.submittedAt,
    },
    fundingCall: {
      ...terms,
      id: fundingCall.id,
      publicationRevisionId: fundingCall.publicationRevisionId,
      publicationRevisionNumber: fundingCall.publicationRevisionNumber,
      ...effectiveFundingCall,
      maximumAmount: Number(terms.maximumGrantAmount),
      minimumAmount: Number(terms.minimumGrantAmount),
    },
    fundingOpportunityTitle: String(terms.title),
  };
}
