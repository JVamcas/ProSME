import type { SequentialTransitionResult } from "../application/runtime/ServerSequentialTransitionService";

export function readSequentialTransitionAdvancement(
  result: SequentialTransitionResult,
): {
  nextStageName: string | null;
  workflowStatus: "ACTIVE" | "COMPLETED";
} | null {
  if (result.kind === "source_stage_not_completed") return null;
  if (result.kind === "transitioned") {
    return {
      nextStageName: result.targets
        .filter((target) => target.targetStageInstanceId)
        .map((target) => target.targetStageName)
        .join(", ") || null,
      workflowStatus: result.workflowStatus,
    };
  }
  if (result.kind === "workflow_completed") {
    return { nextStageName: null, workflowStatus: result.workflowStatus };
  }
  if (result.kind === "already_executed") {
    return {
      nextStageName: result.execution.targets
        .filter((target) => target.targetStageInstanceId)
        .map((target) => target.targetStageName)
        .join(", ") || null,
      workflowStatus: result.execution.workflowStatus === "COMPLETED"
        ? "COMPLETED"
        : "ACTIVE",
    };
  }
  return null;
}
