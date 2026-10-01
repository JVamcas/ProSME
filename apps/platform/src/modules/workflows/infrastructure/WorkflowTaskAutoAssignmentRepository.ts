import "server-only";

import { sql } from "drizzle-orm";

import { ResourceConflictError } from "@/lib/resource-errors";
import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";

type Candidate = {
  roleId: string | null;
  taskDefinitionId: string;
  userId: string;
  workload: number;
};

export type AssignmentSlot = {
  id: string;
  name: string;
  namedUserOverrideId: string | null;
  reviewerCount: number;
  roleId: string | null;
  stableKey: string;
};

/** Load assignment labels only after allocation fails, including ineligible users. */
async function describeAssignee(
  transaction: WorkflowInstanceTransaction,
  definition: AssignmentSlot,
): Promise<string> {
  const result = await transaction.execute(sql`
    SELECT assigned_role.name AS "roleName",
      assigned_user.display_name AS "userName"
    FROM app_stage_task_definitions definition
    LEFT JOIN app_roles assigned_role
      ON assigned_role.id = definition.assignment_role_id
    LEFT JOIN app_users assigned_user
      ON assigned_user.id = definition.assignment_user_id
    WHERE definition.id = ${definition.id}::uuid
  `);
  const labels = result.rows[0] as {
    roleName: string | null;
    userName: string | null;
  } | undefined;

  if (definition.namedUserOverrideId) {
    return labels?.userName
      ? `reviewer "${labels.userName}"`
      : "the configured reviewer (name unavailable)";
  }
  if (definition.roleId) {
    return labels?.roleName
      ? `role "${labels.roleName}"`
      : "the configured role (name unavailable)";
  }
  return "no configured assignee";
}

/** Resolve all reviewer slots before inserting any tasks in the stage transaction. */
export async function allocateStageReviewers(
  transaction: WorkflowInstanceTransaction,
  workflowInstanceId: string,
  definitions: AssignmentSlot[],
): Promise<Map<string, string[]>> {
  if (definitions.length === 0) return new Map();

  const result = await transaction.execute(sql`
    SELECT definition.id AS "taskDefinitionId",
      definition.assignment_role_id AS "roleId",
      candidate.id AS "userId",
      count(owned.id)::integer AS workload
    FROM app_stage_task_definitions definition
    JOIN app_users candidate ON (
      candidate.id = definition.assignment_user_id
      OR (
        definition.assignment_user_id IS NULL
        AND EXISTS (
          SELECT 1 FROM app_user_roles membership
          WHERE membership.user_id = candidate.id
            AND membership.role_id = definition.assignment_role_id
        )
      )
    )
    JOIN app_workflow_instances workflow
      ON workflow.id = ${workflowInstanceId}::uuid
    JOIN app_applications application
      ON application.id = workflow.application_id
    LEFT JOIN app_workflow_tasks owned
      ON owned.assigned_user_id = candidate.id
      AND owned.status IN ('PENDING', 'IN_PROGRESS')
    WHERE definition.id IN (${sql.join(
      definitions.map((item) => sql`${item.id}::uuid`),
      sql`, `,
    )})
      AND candidate.status = 'active'
      AND candidate.id <> application.owner_user_id
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_application_coi clearance
        WHERE clearance.application_id = workflow.application_id
          AND clearance.user_id = candidate.id
          AND clearance.state IN ('PENDING_REVIEW', 'RECUSED', 'REVOKED')
      )
      AND NOT EXISTS (
        SELECT 1 FROM (
          VALUES (definition.permissions ->> 'view'),
            (definition.permissions ->> 'edit'),
            (definition.permissions ->> 'decide')
        ) required(code)
        WHERE required.code IS NULL OR NOT EXISTS (
          SELECT 1 FROM app_user_roles granted_role
          JOIN app_role_capabilities grant_record
            ON grant_record.role_id = granted_role.role_id
          JOIN app_capabilities permission
            ON permission.id = grant_record.capability_id
          WHERE granted_role.user_id = candidate.id
            AND permission.code = required.code
        )
      )
    GROUP BY definition.id, definition.assignment_role_id, candidate.id
    ORDER BY workload ASC, candidate.id ASC
  `);

  const candidates = result.rows as Candidate[];
  const assignments = new Map<string, string[]>();
  const addedWorkload = new Map<string, number>();
  for (const definition of definitions) {
    if (definition.namedUserOverrideId) {
      const eligibleOverride = candidates.some((candidate) =>
        candidate.taskDefinitionId === definition.id
        && candidate.userId === definition.namedUserOverrideId,
      );
      if (!eligibleOverride || definition.reviewerCount !== 1) {
        const assignee = await describeAssignee(transaction, definition);
        throw new ResourceConflictError(
          `Cannot advance the workflow because task "${definition.name}", assigned to ${assignee}, cannot be allocated to an eligible reviewer. Check that this reviewer is active, has the required task permissions, and is eligible for this application, then try again.`,
        );
      }
      assignments.set(definition.id, [definition.namedUserOverrideId]);
      continue;
    }
    const eligible = candidates.filter((candidate) =>
      candidate.taskDefinitionId === definition.id
      && candidate.roleId === definition.roleId,
    );
    if (eligible.length < definition.reviewerCount) {
      const assignee = await describeAssignee(transaction, definition);
      throw new ResourceConflictError(
        `Cannot advance the workflow because task "${definition.name}", assigned to ${assignee}, requires ${definition.reviewerCount} eligible reviewers, but only ${eligible.length} are available. Check the task's assignee configuration and ensure enough active reviewers have the required task permissions and are eligible for this application, then try again.`,
        {
          eligibleReviewers: eligible.length,
          requiredReviewers: definition.reviewerCount,
        },
      );
    }
    const selected: string[] = [];
    while (selected.length < definition.reviewerCount) {
      const next = eligible
        .filter((candidate) => !selected.includes(candidate.userId))
        .sort((left, right) =>
          left.workload + (addedWorkload.get(left.userId) ?? 0)
          - right.workload - (addedWorkload.get(right.userId) ?? 0)
          || left.userId.localeCompare(right.userId),
        )[0];
      if (!next) {
        const assignee = await describeAssignee(transaction, definition);
        throw new ResourceConflictError(
          `Cannot advance the workflow because task "${definition.name}", assigned to ${assignee}, could not be assigned to distinct eligible reviewers.`,
        );
      }
      selected.push(next.userId);
      addedWorkload.set(next.userId, (addedWorkload.get(next.userId) ?? 0) + 1);
    }
    assignments.set(definition.id, selected);
  }
  return assignments;
}
