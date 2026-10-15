"use client";

import { useState } from "react";
import { toast } from "@/shared/ui/Toast";
import { getErrorMessage } from "@/lib/client-http";
import type { WorkflowProgressView } from "../../api/WorkflowProgressTypes";
import { WorkflowProgressPanel } from "../WorkflowProgressPanel";
import { WorkflowStageApplicationsPanel } from "./WorkflowStageApplicationsPanel";
import {
  useDownloadWorkflowStageApplications,
  useWorkflowStageFunnel,
} from "./useWorkflowStageFunnel";

export function WorkflowStageFunnelProgress({
  applicationId,
  progress,
  canInspect,
  canExport,
}: {
  applicationId: string;
  progress: WorkflowProgressView;
  canInspect: boolean;
  canExport: boolean;
}) {
  const summary = useWorkflowStageFunnel(applicationId);
  const download = useDownloadWorkflowStageApplications(applicationId);
  const [selectedStageKey, setSelectedStageKey] = useState<string>();
  const selected = summary.data?.stages.find(
    (stage) => stage.stageKey === selectedStageKey,
  );

  async function exportStage(stageKey: string) {
    try {
      const blob = await download.mutateAsync(stageKey);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stage-applications-${stageKey.replace(/[^a-zA-Z0-9_-]/g, "-")}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(
        getErrorMessage(error) ??
          "The stage applications could not be downloaded.",
      );
    }
  }

  return (
    <WorkflowProgressPanel
      progress={progress}
      funnel={{
        summary: summary.data,
        isLoading: summary.isPending,
        error: summary.error?.message,
        onRetry: () => void summary.refetch(),
        canInspect,
        canExport,
        selectedStageKey,
        exportingStageKey: download.isPending ? download.variables : undefined,
        onInspect: setSelectedStageKey,
        onExport: (stageKey) => void exportStage(stageKey),
        onSelectDetails: () => setSelectedStageKey(undefined),
      }}
      stageApplications={
        selected && canInspect ? (
          <WorkflowStageApplicationsPanel
            key={selected.stageKey}
            applicationId={applicationId}
            stageKey={selected.stageKey}
            stageName={selected.name}
            fundingCallTitle={summary.data?.fundingCallTitle ?? ""}
            onClose={() => setSelectedStageKey(undefined)}
          />
        ) : undefined
      }
    />
  );
}
