import { sql, type SQL } from "drizzle-orm";
import { workflowHoldAffectsTask } from "./WorkflowHoldQueries";

// Merge overlapping holds, RFIs and deferrals before counting paused time.
// The stored due_at remains the original deadline, preserving its audit value.
export function workflowTaskEffectiveDeadline(
  task: SQL,
  now: SQL = sql`CURRENT_TIMESTAMP`,
) {
  return sql`(${task}.due_at + COALESCE((
    SELECT sum(upper(paused.period) - lower(paused.period))
    FROM unnest((
      SELECT range_agg(tstzrange(
        greatest(periods.started_at, ${task}.created_at),
        least(periods.ended_at, ${now}), '[)'
      ))
      FROM (
        SELECT hold.held_at AS started_at,
          coalesce(hold.resumed_at, ${now}) AS ended_at
        FROM app_workflow_holds hold
        WHERE ${workflowHoldAffectsTask(sql`hold`, task)}
        UNION ALL
        SELECT rfi.created_at, coalesce(rfi.continuation_applied_at, least(rfi.deadline_at, ${now}))
        FROM app_workflow_rfis rfi WHERE rfi.task_id = ${task}.id
        UNION ALL
        SELECT deferral.deferred_at, coalesce(deferral.resumed_at, ${now})
        FROM app_workflow_deferrals deferral
        WHERE deferral.stage_instance_id = ${task}.stage_instance_id
      ) periods
      WHERE periods.started_at < ${now}
        AND periods.ended_at > ${task}.created_at
    )) paused(period)
  ), interval '0 seconds'))`;
}
