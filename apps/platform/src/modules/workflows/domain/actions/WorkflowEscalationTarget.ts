import type { EscalateConfiguration } from "./WorkflowActionConfiguration";

export function resolveEscalationConfiguration(
  configuration: EscalateConfiguration,
  selection: { targetType?: "ROLE" | "USER"; targetId?: string },
): EscalateConfiguration {
  if (!selection.targetType || !selection.targetId) return configuration;
  return {
    ...configuration,
    targetType: selection.targetType,
    targetId: selection.targetId,
  };
}
