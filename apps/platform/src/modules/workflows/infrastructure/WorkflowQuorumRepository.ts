import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { users } from "@/db/schema/identity";
import { evaluateQuorum, type QuorumParticipant, type QuorumRule } from
  "../domain/runtime/Quorum";
import { stageTaskDefinitions } from "./workflow.schema";
import {
  stageInstances,
} from "./workflow-runtime.schema";
import {
  workflowQuorumEvaluations,
  workflowQuorumParticipants,
} from "./workflow-review.schema";
import type { StageCompletionTransaction } from "./StageCompletionRepository";

export type RecordQuorumParticipationInput = {
  stageInstanceId: string;
  userId: string;
  responsibility: string;
  isChair: boolean;
  attendance: "PRESENT" | "ABSENT" | "RECUSED";
  coiCleared: boolean;
  abstained: boolean;
  actorId: string;
};

type QuorumDefinition = {
  id: string;
  quorumRule: QuorumRule | null;
};

async function loadQuorumDefinitions(
  transaction: StageCompletionTransaction,
  stageDefinitionId: string,
): Promise<QuorumDefinition[]> {
  return transaction
    .select({
      id: stageTaskDefinitions.id,
      quorumRule: stageTaskDefinitions.quorumRule,
    })
    .from(stageTaskDefinitions)
    .where(and(
      eq(stageTaskDefinitions.stageId, stageDefinitionId),
      eq(stageTaskDefinitions.quorum, true),
    ));
}

async function loadParticipants(
  transaction: StageCompletionTransaction,
  stageInstanceId: string,
  taskDefinitionId: string,
  population: QuorumRule["population"],
): Promise<QuorumParticipant[]> {
  const result = await transaction.execute(population === "ASSIGNED_TASKS"
    ? sql`
      SELECT candidate.id AS "userId",
        COALESCE(participant.is_chair, false) AS "isChair",
        COALESCE(participant.attendance, 'ABSENT') AS attendance,
        COALESCE(participant.coi_cleared, false) AS "coiCleared",
        COALESCE(participant.abstained, false) AS abstained
      FROM (
        SELECT DISTINCT app_user.id
        FROM app_workflow_tasks task
        JOIN app_users app_user ON app_user.id = task.assigned_user_id
        WHERE task.stage_instance_id = ${stageInstanceId}::uuid
          AND task.workflow_task_definition_id = ${taskDefinitionId}::uuid
          AND task.status <> 'CANCELLED'
          AND app_user.status = 'active'
      ) candidate
      LEFT JOIN app_workflow_quorum_participants participant
        ON participant.stage_instance_id = ${stageInstanceId}::uuid
        AND participant.user_id = candidate.id
      ORDER BY candidate.id
    `
    : sql`
      SELECT app_user.id AS "userId", participant.is_chair AS "isChair",
        participant.attendance, participant.coi_cleared AS "coiCleared",
        participant.abstained
      FROM app_workflow_quorum_participants participant
      JOIN app_users app_user ON app_user.id = participant.user_id
      WHERE participant.stage_instance_id = ${stageInstanceId}::uuid
        AND app_user.status = 'active'
      ORDER BY app_user.id
    `);
  return result.rows as QuorumParticipant[];
}

export async function evaluateStageQuorum(
  transaction: StageCompletionTransaction,
  input: {
    stageDefinitionId: string;
    stageInstanceId: string;
    actorId: string;
  },
): Promise<boolean> {
  const definitions = await loadQuorumDefinitions(
    transaction,
    input.stageDefinitionId,
  );
  let allSatisfied = true;
  for (const definition of definitions) {
    if (!definition.quorumRule) return false;
    const rule = definition.quorumRule;
    if (rule.freeze === "ON_FIRST_PASS") {
      const [frozen] = await transaction
        .select({ satisfied: workflowQuorumEvaluations.satisfied })
        .from(workflowQuorumEvaluations)
        .where(and(
          eq(workflowQuorumEvaluations.stageInstanceId, input.stageInstanceId),
          eq(workflowQuorumEvaluations.taskDefinitionId, definition.id),
          eq(workflowQuorumEvaluations.satisfied, true),
        ))
        .limit(1);
      if (frozen) continue;
    }
    const participants = await loadParticipants(
      transaction,
      input.stageInstanceId,
      definition.id,
      rule.population,
    );
    const result = evaluateQuorum(rule, participants);
    await transaction.insert(workflowQuorumEvaluations).values({
      stageInstanceId: input.stageInstanceId,
      taskDefinitionId: definition.id,
      rule,
      eligibleDenominator: result.denominator,
      presentUserIds: result.present.map((item) => item.userId),
      clearedUserIds: participants.filter((item) => item.coiCleared)
        .map((item) => item.userId),
      recusedUserIds: participants.filter(
        (item) => item.attendance === "RECUSED",
      ).map((item) => item.userId),
      absentUserIds: participants.filter(
        (item) => item.attendance === "ABSENT",
      ).map((item) => item.userId),
      satisfied: result.satisfied,
      triggerActorId: input.actorId,
    });
    if (!result.satisfied) allSatisfied = false;
  }
  return allSatisfied;
}

export async function recordQuorumParticipation(
  input: RecordQuorumParticipationInput,
) {
  return getDatabase().transaction(async (transaction) => {
    const [stage] = await transaction
      .select({
        id: stageInstances.id,
        stageDefinitionId: stageInstances.workflowStageDefinitionId,
      })
      .from(stageInstances)
      .where(and(
        eq(stageInstances.id, input.stageInstanceId),
        eq(stageInstances.status, "ACTIVE"),
      ))
      .for("update")
      .limit(1);
    if (!stage) return false;
    const definitions = await loadQuorumDefinitions(
      transaction,
      stage.stageDefinitionId,
    );
    if (!definitions.length) return false;
    const [eligible] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.id, input.userId),
        eq(users.status, "active"),
        eq(users.userType, "staff"),
      ))
      .limit(1);
    if (!eligible) return false;
    if (definitions.some(
      (definition) => definition.quorumRule?.population === "ASSIGNED_TASKS",
    )) {
      const result = await transaction.execute(sql`
        SELECT 1 FROM app_workflow_tasks
        WHERE stage_instance_id = ${stage.id}::uuid
          AND assigned_user_id = ${input.userId}::uuid
          AND status <> 'CANCELLED'
        LIMIT 1
      `);
      if (!result.rowCount) return false;
    }
    await transaction.insert(workflowQuorumParticipants).values({
      stageInstanceId: stage.id,
      userId: input.userId,
      responsibility: input.responsibility,
      isChair: input.isChair,
      attendance: input.attendance,
      coiCleared: input.coiCleared,
      abstained: input.abstained,
      updatedBy: input.actorId,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [
        workflowQuorumParticipants.stageInstanceId,
        workflowQuorumParticipants.userId,
      ],
      set: {
        responsibility: input.responsibility,
        isChair: input.isChair,
        attendance: input.attendance,
        coiCleared: input.coiCleared,
        abstained: input.abstained,
        updatedBy: input.actorId,
        updatedAt: new Date(),
      },
    });
    await evaluateStageQuorum(transaction, {
      stageDefinitionId: stage.stageDefinitionId,
      stageInstanceId: stage.id,
      actorId: input.actorId,
    });
    return true;
  });
}
