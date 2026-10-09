import "server-only";
import { lockWorkflowRuntimeForTask } from "@/modules/workflows/infrastructure/WorkflowRuntimeLock";
import { workflowTaskHasActiveHold } from "@/modules/workflows/infrastructure/WorkflowHoldQueries";

import { eq, sql, getTableColumns } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { stageTaskDefinitions, workflowTasks } from "@/db/schema";
import type { WorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import type { AuthoritativeEligibilityOutcome } from "../domain/AuthoritativeEligibilityOutcome";
import {
  createAuthoritativeEligibilityOutcomeRecord,
  type AuthoritativeEligibilityOutcomeWrite,
} from "./AuthoritativeEligibilityRepository";
import { persistAuthoritativeEligibilityTaskCompletion } from "./AuthoritativeEligibilityTaskCompletionRepository";
import { authoritativeEligibilityOutcomes } from "./eligibility-outcome.schema";

export type AuthoritativeEligibilityExecutionTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

export type AuthoritativeEligibilityTaskTarget = {
  application: {
    businessSection: Record<string, never>;
    declarationsSection: { compliance?: boolean };
    eligibilityRuleSetVersionId: string | null;
    financialSection: { amountRequested?: number };
    formVersionId: string | null;
    id: string;
    projectSection: Record<string, never>;
    rowVersion: number;
  };
  assignedToActor: boolean;
  business: {
    employeeCount: number | null;
    establishedYear: number | null;
    registrationNumber: string;
    updatedAt: Date;
  };
  config: unknown;
  formVersionId: string | null;
  fundingCall: {
    closesAt: Date;
    eligibilityRuleSetVersionId: string | null;
    fundingInstrument: string | null;
    id: string;
    maximumGrantAmount: string;
    minimumGrantAmount: string;
    opensAt: Date;
    slug: string;
    status: string;
    thematicArea: string | null;
    title: string;
    totalBudgetEnvelope: string;
  };
  permissions: WorkflowElementPermissions;
  prerequisiteNames: string[];
  previousOutcome: AuthoritativeEligibilityOutcome | null;
  rowVersion: number;
  stageInstanceId: string;
  status: string;
  taskId: string;
  taskKey: string;
  workflowInstanceId: string;
};

function readTimestamp(value: unknown, field: string): Date {
  const timestamp = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(`Invalid ${field} timestamp in eligibility task context.`);
  }
  return timestamp;
}

export function withAuthoritativeEligibilityExecutionTransaction<T>(
  work: (
    transaction: AuthoritativeEligibilityExecutionTransaction,
  ) => Promise<T>,
) {
  return getDatabase().transaction(work);
}

export async function lockAuthoritativeEligibilityTask(
  transaction: AuthoritativeEligibilityExecutionTransaction,
  taskId: string,
  actorId: string,
): Promise<AuthoritativeEligibilityTaskTarget | null> {
  // Match manual action locking order: workflow, stage, then task.
  await lockWorkflowRuntimeForTask(transaction, taskId);
  await transaction.execute(sql`
    SELECT stage.id FROM app_workflow_stage_instances stage
    JOIN app_workflow_tasks task ON task.stage_instance_id = stage.id
    WHERE task.id = ${taskId}::uuid
      AND NOT ${workflowTaskHasActiveHold(sql`task`)}
      AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
    FOR UPDATE OF stage
  `);
  const rows = await transaction.execute(sql`
    SELECT task.id AS "taskId", task.status, task.row_version AS "rowVersion",
      definition.code AS "taskKey",
      definition.config, definition.permissions,
      task.form_version_id AS "taskFormVersionId",
      stage.id AS "stageInstanceId", workflow.id AS "workflowInstanceId",
      application.id AS "applicationId",
      application.business_section AS "applicationBusinessSection",
      snapshot.normalized_form_values AS "applicationFormValues",
      application.declarations_section AS "applicationDeclarationsSection",
      application.eligibility_rule_set_version_id AS "applicationEligibilityVersionId",
      application.financial_section AS "applicationFinancialSection",
      application.form_version_id AS "applicationFormVersionId",
      application.project_section AS "applicationProjectSection",
      application.row_version AS "applicationRowVersion",
      business.employee_count AS "businessEmployeeCount",
      business.established_year AS "businessEstablishedYear",
      business.registration_number AS "businessRegistrationNumber",
      business.updated_at AS "businessUpdatedAt",
      funding_call.closes_at AS "fundingCallClosesAt",
      publication.snapshot->>'eligibilityRuleSetVersionId' AS "fundingCallEligibilityVersionId",
      publication.snapshot->>'fundingInstrument' AS "fundingCallInstrument",
      funding_call.id AS "fundingCallId",
      publication.snapshot->>'maximumGrantAmount' AS "fundingCallMaximumAmount",
      publication.snapshot->>'minimumGrantAmount' AS "fundingCallMinimumAmount",
      funding_call.opens_at AS "fundingCallOpensAt",
      funding_call.slug AS "fundingCallSlug",
      funding_call.status AS "fundingCallStatus",
      publication.snapshot->>'thematicArea' AS "fundingCallThematicArea",
      publication.snapshot->>'title' AS "fundingCallTitle",
      publication.snapshot->>'totalBudgetEnvelope' AS "fundingCallTotalBudget",
      app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
      AND (
        task.assigned_user_id = ${actorId}::uuid
        OR (
          task.assigned_user_id IS NULL
          AND task.assigned_role_id IN (
            SELECT role_id FROM app_user_roles WHERE user_id = ${actorId}::uuid
          )
        )
      ) AS "assignedToActor",
      COALESCE((
        SELECT jsonb_agg(prerequisite_definition.name ORDER BY prerequisite_definition.sequence)
        FROM app_stage_task_definitions prerequisite_definition
        JOIN app_workflow_tasks prerequisite
          ON prerequisite.workflow_task_definition_id = prerequisite_definition.id
          AND prerequisite.stage_instance_id = stage.id
        WHERE prerequisite_definition.stage_id = definition.stage_id
          AND prerequisite_definition.required = TRUE
          AND prerequisite_definition.sequence < definition.sequence
          AND prerequisite.status <> 'COMPLETED'
      ), '[]'::jsonb) AS "prerequisiteNames",
      previous.id AS "previousId",
      previous.evaluation_number AS "previousEvaluationNumber",
      previous.context_reference AS "previousContextReference",
      previous.eligible AS "previousEligible",
      previous.evaluated_at AS "previousEvaluatedAt",
      previous.evaluated_by AS "previousEvaluatedBy",
      previous.evaluated_values AS "previousEvaluatedValues",
      previous.evaluated_value_provenance AS "previousEvaluatedValueProvenance",
      previous.final_screening_outcome AS "previousFinalOutcome",
      previous.hard_failures AS "previousHardFailures",
      previous.manual_screening_required AS "previousManualScreeningRequired",
      previous.rule_outcomes AS "previousRuleOutcomes",
      previous.eligibility_rule_set_version_id AS "previousRuleSetVersionId",
      previous.rule_set_version_number AS "previousRuleSetVersionNumber",
      previous.soft_failures AS "previousSoftFailures",
      previous.warnings AS "previousWarnings",
      previous.workflow_task_id AS "previousWorkflowTaskId"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    JOIN app_applications application ON application.id = workflow.application_id
    JOIN app_business_profiles business ON business.id = application.business_id
    LEFT JOIN app_application_submission_snapshots snapshot
      ON snapshot.id = application.submission_snapshot_id
    JOIN app_funding_call_publication_revisions publication
      ON publication.id = application.funding_call_version_id
    JOIN app_funding_calls funding_call
      ON funding_call.id = application.funding_opportunity_id
    LEFT JOIN LATERAL (
      SELECT outcome.* FROM app_authoritative_eligibility_outcomes outcome
      WHERE outcome.application_id = application.id
      ORDER BY outcome.evaluation_number DESC LIMIT 1
    ) previous ON TRUE
    WHERE task.id = ${taskId}::uuid
      AND NOT ${workflowTaskHasActiveHold(sql`task`)}
      AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
      AND stage.status = 'ACTIVE' AND workflow.status = 'ACTIVE'
    FOR UPDATE OF task
  `);
  return decodeEligibilityTaskTarget(
    rows.rows[0] as Record<string, unknown> | undefined,
  );
}

function decodeEligibilityTaskTarget(
  row: Record<string, unknown> | undefined,
): AuthoritativeEligibilityTaskTarget | null {
  if (!row) return null;
  const previousOutcome = row.previousId
    ? ({
        applicationId: row.applicationId,
        contextReference: row.previousContextReference,
        eligible: row.previousEligible,
        evaluatedAt: readTimestamp(
          row.previousEvaluatedAt,
          "previous evaluation",
        ),
        evaluatedBy: row.previousEvaluatedBy,
        evaluatedValueProvenance: row.previousEvaluatedValueProvenance,
        evaluatedValues: row.previousEvaluatedValues,
        evaluationNumber: row.previousEvaluationNumber,
        finalOutcome: row.previousFinalOutcome,
        hardFailures: row.previousHardFailures,
        id: row.previousId,
        manualScreeningRequired: row.previousManualScreeningRequired,
        ruleOutcomes: row.previousRuleOutcomes,
        ruleSetVersionId: row.previousRuleSetVersionId,
        ruleSetVersionNumber: row.previousRuleSetVersionNumber,
        softFailures: row.previousSoftFailures,
        warnings: row.previousWarnings,
        workflowTaskId: row.previousWorkflowTaskId,
      } as AuthoritativeEligibilityOutcome)
    : null;
  return {
    application: {
      businessSection: {
        ...((row.applicationFormValues as Record<string, never> | null) ?? {}),
        ...(row.applicationBusinessSection as Record<string, never>),
      },
      declarationsSection: row.applicationDeclarationsSection as {
        compliance?: boolean;
      },
      eligibilityRuleSetVersionId: row.applicationEligibilityVersionId as
        string | null,
      financialSection: row.applicationFinancialSection as {
        amountRequested?: number;
      },
      formVersionId: row.applicationFormVersionId as string | null,
      id: String(row.applicationId),
      projectSection: row.applicationProjectSection as Record<string, never>,
      rowVersion: Number(row.applicationRowVersion),
    },
    assignedToActor: Boolean(row.assignedToActor),
    business: {
      employeeCount:
        row.businessEmployeeCount === null
          ? null
          : Number(row.businessEmployeeCount),
      establishedYear:
        row.businessEstablishedYear === null
          ? null
          : Number(row.businessEstablishedYear),
      registrationNumber: String(row.businessRegistrationNumber),
      updatedAt: readTimestamp(row.businessUpdatedAt, "business profile"),
    },
    config: row.config,
    formVersionId: row.taskFormVersionId as string | null,
    fundingCall: {
      closesAt: readTimestamp(row.fundingCallClosesAt, "funding call close"),
      eligibilityRuleSetVersionId: row.fundingCallEligibilityVersionId as
        string | null,
      fundingInstrument: row.fundingCallInstrument as string | null,
      id: String(row.fundingCallId),
      maximumGrantAmount: String(row.fundingCallMaximumAmount),
      minimumGrantAmount: String(row.fundingCallMinimumAmount),
      opensAt: readTimestamp(row.fundingCallOpensAt, "funding call open"),
      slug: String(row.fundingCallSlug),
      status: String(row.fundingCallStatus),
      thematicArea: row.fundingCallThematicArea as string | null,
      title: String(row.fundingCallTitle),
      totalBudgetEnvelope: String(row.fundingCallTotalBudget),
    },
    permissions: row.permissions as WorkflowElementPermissions,
    prerequisiteNames: row.prerequisiteNames as string[],
    previousOutcome,
    rowVersion: Number(row.rowVersion),
    stageInstanceId: String(row.stageInstanceId),
    status: String(row.status),
    taskId: String(row.taskId),
    taskKey: String(row.taskKey),
    workflowInstanceId: String(row.workflowInstanceId),
  };
}

export async function findAuthoritativeEligibilityExecutionByCommand(
  transaction: AuthoritativeEligibilityExecutionTransaction,
  commandKey: string,
): Promise<
  | (AuthoritativeEligibilityOutcome & {
      permissions: WorkflowElementPermissions;
      assignedUserId: string | null;
      coiCleared: boolean;
      taskRowVersion: number;
      terminalStatus: string | null;
    })
  | null
> {
  const [outcome] = await transaction
    .select({
      ...getTableColumns(authoritativeEligibilityOutcomes),
      permissions: stageTaskDefinitions.permissions,
      assignedUserId: workflowTasks.assignedUserId,
      coiCleared: sql<boolean>`app_workflow_task_coi_cleared(
        ${workflowTasks.id}, ${authoritativeEligibilityOutcomes.evaluatedBy}
      )`,
      taskRowVersion: workflowTasks.rowVersion,
      terminalStatus: sql<string | null>`(
        SELECT workflow.public_status ->> 'status'
        FROM app_workflow_instances workflow
        JOIN app_workflow_stage_instances stage ON stage.workflow_instance_id = workflow.id
        WHERE stage.id = ${workflowTasks.stageInstanceId} AND workflow.status = 'REJECTED'
      )`,
    })
    .from(authoritativeEligibilityOutcomes)
    .innerJoin(
      workflowTasks,
      eq(workflowTasks.id, authoritativeEligibilityOutcomes.workflowTaskId),
    )
    .innerJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.id, workflowTasks.workflowTaskDefinitionId),
    )
    .where(eq(authoritativeEligibilityOutcomes.commandKey, commandKey))
    .limit(1);
  return outcome ?? null;
}

export async function persistAuthoritativeEligibilityExecution(
  transaction: AuthoritativeEligibilityExecutionTransaction,
  input: {
    commandKey: string;
    correlationId: string;
    expectedRowVersion: number;
    outcome: AuthoritativeEligibilityOutcomeWrite;
    evaluatedFormValues?: Record<string, unknown>;
    stageInstanceId: string;
    taskId: string;
    workflowInstanceId: string;
  },
) {
  const created = await createAuthoritativeEligibilityOutcomeRecord(
    transaction,
    { ...input.outcome, commandKey: input.commandKey },
  );
  const result = {
    eligible: created.eligible,
    evaluationId: created.id,
    evaluationNumber: created.evaluationNumber,
    hardFailureCount: created.hardFailures.length,
    manualScreeningRequired: created.manualScreeningRequired,
    outcome: created.finalOutcome,
    softFailureCount: created.softFailures.length,
    warningCount: created.warnings.length,
  };
  const rowVersion = await persistAuthoritativeEligibilityTaskCompletion(
    transaction,
    input,
    result,
    created.evaluatedBy,
  );
  return { ...result, rowVersion };
}
