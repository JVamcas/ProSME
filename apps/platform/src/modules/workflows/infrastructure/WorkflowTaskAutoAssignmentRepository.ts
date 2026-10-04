import "server-only";

import { sql } from "drizzle-orm";
import { workflowReviewerEligibility } from "./WorkflowReviewerEligibility";

import { ResourceConflictError } from "@/lib/resource-errors";
import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";

type Candidate = {
  roleId: string | null;
  taskDefinitionId: string;
  userId: string;
  workload: number;
};

export type AssignmentSlot = {
  excludedUserIds?: string[];
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
    FROM (SELECT ${definition.roleId}::uuid AS role_id,
      ${definition.namedUserOverrideId}::uuid AS user_id) assignment
    LEFT JOIN app_roles assigned_role ON assigned_role.id = assignment.role_id
    LEFT JOIN app_users assigned_user ON assigned_user.id = assignment.user_id
  `);
  const labels = result.rows[0] as
    | {
        roleName: string | null;
        userName: string | null;
      }
    | undefined;

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

  const allocationRows = definitions.map(
    (definition) => sql`(
    ${definition.id}::uuid,
    ${definition.roleId}::uuid,
    ${definition.namedUserOverrideId}::uuid,
    ${JSON.stringify(definition.excludedUserIds ?? [])}::jsonb
  )`,
  );
  const result = await transaction.execute(sql`
    WITH allocation(id, role_id, user_id, excluded_user_ids) AS (
      VALUES ${sql.join(allocationRows, sql`, `)}
    )
    SELECT definition.id AS "taskDefinitionId",
      allocation.role_id AS "roleId",
      candidate.id AS "userId",
      count(owned.id)::integer AS workload
    FROM app_stage_task_definitions definition
    JOIN allocation ON allocation.id = definition.id
    JOIN app_users candidate ON (
      candidate.id = allocation.user_id
      OR (
        allocation.user_id IS NULL
        AND EXISTS (
          SELECT 1 FROM app_user_roles membership
          WHERE membership.user_id = candidate.id
            AND membership.role_id = allocation.role_id
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
      AND ${workflowReviewerEligibility(sql`allocation.excluded_user_ids`)}
    GROUP BY definition.id, allocation.role_id, candidate.id
    ORDER BY workload ASC, candidate.id ASC
  `);

  const candidates = result.rows as Candidate[];
  const assignments = new Map<string, string[]>();
  const addedWorkload = new Map<string, number>();
  for (const definition of definitions) {
    if (definition.namedUserOverrideId) {
      const eligibleOverride = candidates.some(
        (candidate) =>
          candidate.taskDefinitionId === definition.id &&
          candidate.userId === definition.namedUserOverrideId,
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
    const eligible = candidates.filter(
      (candidate) =>
        candidate.taskDefinitionId === definition.id &&
        candidate.roleId === definition.roleId,
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
        .sort(
          (left, right) =>
            left.workload +
              (addedWorkload.get(left.userId) ?? 0) -
              right.workload -
              (addedWorkload.get(right.userId) ?? 0) ||
            left.userId.localeCompare(right.userId),
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
