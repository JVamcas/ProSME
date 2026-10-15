import type { WorkflowStageFunnelSummary } from "../../api/WorkflowStageFunnelTypes";

export type WorkflowStageFunnelControls = {
  summary?: WorkflowStageFunnelSummary;
  isLoading: boolean;
  error?: string;
  canInspect: boolean;
  canExport: boolean;
  selectedStageKey?: string;
  exportingStageKey?: string;
  onInspect: (stageKey: string) => void;
  onExport: (stageKey: string) => void;
  onSelectDetails: () => void;
  onRetry: () => void;
};
