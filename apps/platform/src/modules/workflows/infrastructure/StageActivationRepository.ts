import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  applications,
  applicationSubmissionSnapshots,
  authoritativeEligibilityOutcomes,
  stageInstances,
  stageTaskDefinitions,
  stageTaskFormBindings,
  workflowInstances,
  workflowStageDefinitions,
} from "@/db/schema";
import type { StageInstanceStatus } from "../domain/runtime/StageInstance";
import type { WorkflowPublicStatusMapping } from "../domain/definitions/WorkflowStageDefinition";
import { createStageInstance } from "./StageInstanceRepository";
import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";
import { createWorkflowTasks } from "./WorkflowTaskWriteRepository";
import { resolveEligibilityTaskFormVersion } from "./EligibilityTaskFormRepository";
import { appendStageActivationAudit } from "./StageActivationAuditRepository";
import { allocateStageReviewers } from "./WorkflowTaskAutoAssignmentRepository";

export type StageActivationTransaction = WorkflowInstanceTransaction;

export type StageActivationTarget = {
  application: Record<string, unknown>;
  currentStageInstanceId: string | null;
  eligibility: Record<string, unknown> | null;
  entryCondition: typeof workflowStageDefinitions.$inferSelect.entryCondition;
  fundingCall: Record<string, unknown>;
  repeatable: boolean;
  publicStatus: WorkflowPublicStatusMapping;
  slaHours: number | null;
  stageDefinitionId: string;
  stageKey: string;
  workflowInstanceId: string;
};

export type StageActivationTaskDefinition = {
  formVersionId: string | null;
  id: string;
  namedUserOverrideId: string | null;
  reviewerCount: number;
  roleId: string | null;
  stableKey: string;
};

export type PriorStageActivationContext = {
  stableKey: string;
  values: Record<string, unknown>;
};

export type ExistingStageIteration = {
  activatedAt: Date;
  id: string;
  iterationNumber: number;
  status: StageInstanceStatus;
};

export type PersistStageActivationInput = {
  activatedAt: Date;
  actorId: string;
  correlationId: string;
  iterationNumber: number;
  referralContext?: Record<string, unknown> | null;
  returnContext?: Record<string, unknown> | null;
  target: StageActivationTarget;
  tasks: StageActivationTaskDefinition[];
};

export function withStageActivationTransaction<T>(
  work: (transaction: StageActivationTransaction) => Promise<T>,
) {
  return getDatabase().transaction(work);
}

export async function lockStageActivationTarget(
  transaction: StageActivationTransaction,
  workflowInstanceId: string,
  stageDefinitionId: string,
): Promise<StageActivationTarget | null> {
  const [row] = await transaction
    .select({
      snapshotContent: applicationSubmissionSnapshots.snapshotContent,
      currentStageInstanceId: workflowInstances.currentStageInstanceId,
      eligibility: {
        eligible: authoritativeEligibilityOutcomes.eligible,
        evaluatedAt: authoritativeEligibilityOutcomes.evaluatedAt,
        outcome: authoritativeEligibilityOutcomes.finalOutcome,
        hardFailureCount: sql<number>`jsonb_array_length(${authoritativeEligibilityOutcomes.hardFailures})`,
        manualScreeningRequired:
          authoritativeEligibilityOutcomes.manualScreeningRequired,
        ruleSetVersionId:
          authoritativeEligibilityOutcomes.ruleSetVersionId,
        ruleSetVersionNumber:
          authoritativeEligibilityOutcomes.ruleSetVersionNumber,
        softFailureCount: sql<number>`jsonb_array_length(${authoritativeEligibilityOutcomes.softFailures})`,
        warningCount: sql<number>`jsonb_array_length(${authoritativeEligibilityOutcomes.warnings})`,
      },
      entryCondition: workflowStageDefinitions.entryCondition,
      publicStatus: {
        status: workflowStageDefinitions.applicantStatus,
        label: workflowStageDefinitions.applicantLabel,
        description: workflowStageDefinitions.applicantDescription,
      },
      repeatable: workflowStageDefinitions.repeatable,
      slaHours: workflowStageDefinitions.slaHours,
      stageDefinitionId: workflowStageDefinitions.id,
      stageKey: workflowStageDefinitions.code,
      workflowInstanceId: workflowInstances.id,
    })
    .from(workflowInstances)
    .innerJoin(
      applications,
      eq(applications.id, workflowInstances.applicationId),
    )
    .innerJoin(
      applicationSubmissionSnapshots,
      eq(
        applicationSubmissionSnapshots.id,
        applications.submissionSnapshotId,
      ),
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
    .where(and(
      eq(workflowInstances.id, workflowInstanceId),
      eq(workflowInstances.status, "ACTIVE"),
    ))
    .for("update", { of: workflowInstances })
    .limit(1);

  if (!row) return null;
  const content = row.snapshotContent;
  const application = content.application;
  const fundingCall = content.fundingCall;
  const terms = fundingCall.terms as Record<string, unknown>;
  const { snapshotContent: _snapshotContent, ...target } = row;
  void _snapshotContent;
  return {
    ...target,
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
      status: fundingCall.statusAtSubmission,
      maximumAmount: Number(terms.maximumGrantAmount),
      minimumAmount: Number(terms.minimumGrantAmount),
    },
  };
}

export async function findStageIteration(
  transaction: StageActivationTransaction,
  workflowInstanceId: string,
  stageDefinitionId: string,
  iterationNumber: number,
): Promise<ExistingStageIteration | null> {
  const [stage] = await transaction.query.stageInstances.findMany({
    columns: {
      activatedAt: true,
      id: true,
      iterationNumber: true,
      status: true,
    },
    limit: 1,
    where: (table, operators) => operators.and(
      operators.eq(table.workflowInstanceId, workflowInstanceId),
      operators.eq(table.workflowStageDefinitionId, stageDefinitionId),
      operators.eq(table.iterationNumber, iterationNumber),
    ),
  });
  return stage ?? null;
}

export async function findStageInstanceStatus(
  transaction: StageActivationTransaction,
  stageInstanceId: string,
): Promise<StageInstanceStatus | null> {
  const [stage] = await transaction
    .select({ status: stageInstances.status })
    .from(stageInstances)
    .where(eq(stageInstances.id, stageInstanceId))
    .limit(1);
  return stage?.status ?? null;
}

export async function loadStageActivationTasks(
  transaction: StageActivationTransaction,
  stageDefinitionId: string,
): Promise<StageActivationTaskDefinition[]> {
  return transaction
    .select({
      formVersionId: stageTaskFormBindings.formVersionId,
      id: stageTaskDefinitions.id,
      namedUserOverrideId: stageTaskDefinitions.namedUserOverrideId,
      reviewerCount: stageTaskDefinitions.reviewerCount,
      roleId: stageTaskDefinitions.roleId,
      stableKey: stageTaskDefinitions.stableKey,
    })
    .from(stageTaskDefinitions)
    .leftJoin(
      stageTaskFormBindings,
      eq(stageTaskFormBindings.taskDefinitionId, stageTaskDefinitions.id),
    )
    .where(eq(stageTaskDefinitions.stageId, stageDefinitionId))
    .orderBy(asc(stageTaskDefinitions.displayOrder));
}

type PriorStageRow = {
  result: Record<string, unknown> | null;
  stageKey: string;
  values: Record<string, unknown> | null;
};

export async function loadPriorStageContext(
  transaction: Pick<StageActivationTransaction, "execute">,
  workflowInstanceId: string,
): Promise<PriorStageActivationContext[]> {
  const result = await transaction.execute(sql`
    WITH latest_completed_stage AS (
      SELECT DISTINCT ON (definition.code)
        stage.id,
        definition.code
      FROM app_workflow_stage_instances stage
      JOIN app_workflow_stage_definitions definition
        ON definition.id = stage.workflow_stage_definition_id
      WHERE stage.workflow_instance_id = ${workflowInstanceId}::uuid
        AND stage.status = 'COMPLETED'
      ORDER BY definition.code, stage.iteration_number DESC,
        stage.completed_at DESC, stage.id DESC
    )
    SELECT latest.code AS "stageKey",
      response.values,
      task.result
    FROM latest_completed_stage latest
    LEFT JOIN app_workflow_tasks task
      ON task.stage_instance_id = latest.id
      AND task.status = 'COMPLETED'
      AND (task.form_version_id IS NULL OR EXISTS (
        SELECT 1 FROM app_form_responses submitted
        WHERE submitted.workflow_task_id = task.id
          AND submitted.status = 'COMPLETED'
      ))
    LEFT JOIN app_form_responses response
      ON response.workflow_task_id = task.id
      AND response.status = 'COMPLETED'
    ORDER BY latest.code, task.created_at, task.id
  `);
  const stages = new Map<string, Record<string, unknown>>();
  for (const row of result.rows as PriorStageRow[]) {
    const values = stages.get(row.stageKey) ?? {};
    Object.assign(values, row.values ?? {}, row.result ?? {});
    stages.set(row.stageKey, values);
  }
  return [...stages].map(([stableKey, values]) => ({ stableKey, values }));
}

export async function persistStageActivation(
  transaction: StageActivationTransaction,
  input: PersistStageActivationInput,
) {
  const stage = await createStageInstance(transaction, {
    activatedAt: input.activatedAt,
    iterationNumber: input.iterationNumber,
    referralContext: input.referralContext,
    returnContext: input.returnContext,
    workflowInstanceId: input.target.workflowInstanceId,
    workflowStageDefinitionId: input.target.stageDefinitionId,
  });
  const dueAt = input.target.slaHours === null
    ? null
    : new Date(
      input.activatedAt.getTime() + input.target.slaHours * 3_600_000,
    );
  const needsEligibilityForm = input.tasks.some(
    (task) => task.stableKey === "ELIGIBILITY_VERIFICATION",
  );
  const eligibilityFormVersionId = needsEligibilityForm
    ? await resolveEligibilityTaskFormVersion(
        transaction,
        input.target.workflowInstanceId,
      )
    : null;
  if (needsEligibilityForm && !eligibilityFormVersionId) {
    throw new Error(
      "The application's published eligibility ruleset has no verification form.",
    );
  }
  const assignments = await allocateStageReviewers(
    transaction,
    input.target.workflowInstanceId,
    input.tasks,
  );
  const tasks = await createWorkflowTasks(
    transaction,
    input.tasks.flatMap((task) => Array.from(
      { length: task.reviewerCount },
      (_, index) => ({
      assignedRoleId: null,
      assignedUserId: assignments.get(task.id)?.[index] ?? null,
      createdAt: input.activatedAt,
      dueAt,
      formVersionId: task.stableKey === "ELIGIBILITY_VERIFICATION"
        ? eligibilityFormVersionId!
        : task.formVersionId,
      stageInstanceId: stage.id,
      workflowTaskDefinitionId: task.id,
      reviewerSlot: index + 1,
    }),
    )),
  );
  await transaction
    .update(workflowInstances)
    .set({ currentStageInstanceId: stage.id })
    .where(eq(workflowInstances.id, input.target.workflowInstanceId));
  await appendStageActivationAudit(transaction, {
    actorId: input.actorId,
    correlationId: input.correlationId,
    iterationNumber: stage.iterationNumber,
    stageDefinitionId: input.target.stageDefinitionId,
    stageId: stage.id,
    stageKey: input.target.stageKey,
    publicStatus: input.target.publicStatus,
    tasks,
    workflowInstanceId: input.target.workflowInstanceId,
  });
  return { stage, tasks };
}
