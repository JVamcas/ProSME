import type { SequentialTransitionResult } from "../application/runtime/ServerSequentialTransitionService";

export function readSequentialTransitionAdvancement(
  result: SequentialTransitionResult,
): {
  nextStageName: string | null;
  workflowStatus: "ACTIVE" | "COMPLETED";
} | null {
  if (result.kind === "source_stage_not_completed") return null;
  if (result.kind === "target_entry_condition_failed") {
    return { nextStageName: null, workflowStatus: "ACTIVE" };
  }
  if (result.kind === "transitioned") {
    return {
      nextStageName: result.targetStageName,
      workflowStatus: result.workflowStatus,
    };
  }
  if (result.kind === "workflow_completed") {
    return { nextStageName: null, workflowStatus: result.workflowStatus };
  }
  if (result.kind === "already_executed") {
    return {
      nextStageName: result.execution.targetStageName,
      workflowStatus: result.execution.workflowStatus === "COMPLETED"
        ? "COMPLETED"
        : "ACTIVE",
    };
  }
  return null;
}
