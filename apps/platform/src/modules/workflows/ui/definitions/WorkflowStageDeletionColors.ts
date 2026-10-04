import type { WorkflowStageDeletionInspection } from "../../domain/definitions/WorkflowStageDeletion";
import type { WorkflowStageConnectionRole } from "./WorkflowStageConnectionColors";

export function workflowStageDeletionRoles(
  inspection: WorkflowStageDeletionInspection,
): Map<string, WorkflowStageConnectionRole> {
  const roles = new Map<string, WorkflowStageConnectionRole>();
  for (const route of inspection.incomingRoutes) {
    roles.set(route.transition.sourceStageKey, "incoming");
  }
  for (const transition of inspection.outgoingTransitions) {
    for (const target of transition.targetStageKeys) {
      const existing = roles.get(target);
      roles.set(
        target,
        existing === "incoming" || existing === "both" ? "both" : "outgoing",
      );
    }
  }
  roles.set(inspection.stage.stableKey, "deleting");
  return roles;
}
