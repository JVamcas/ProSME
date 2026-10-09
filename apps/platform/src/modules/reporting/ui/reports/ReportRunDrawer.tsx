"use client";

import { useRef } from "react";
import { GeneralButton } from "@/components/ui/button";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import {
  useDownloadReportArtifact,
  useReportRunDetail,
  useRetryReportRun,
} from "./useReports";
import { ReportRunCard } from "./ReportRunCard";
import { ReportRunArtifacts } from "./ReportRunArtifacts";
import type { ReportArtifact } from "../../domain/Report";

export function ReportRunDrawer({
  reportId,
  runId,
  onClose,
  canDownload,
  canRun = false,
}: {
  reportId: string;
  runId?: string;
  onClose: () => void;
  canDownload: boolean;
  canRun?: boolean;
}) {
  const retry = useRetryReportRun(reportId);
  const retryKey = useRef(crypto.randomUUID());
  const download = useDownloadReportArtifact(reportId);
  const query = useReportRunDetail(reportId, runId);

  async function downloadArtifact(artifact: ReportArtifact) {
    if (!runId || !canDownload) return;
    try {
      const blob = await download.mutateAsync({
        runId,
        artifactId: artifact.id,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = artifact.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // The existing mutation displays download errors.
    }
  }

  return (
    <RightDrawer title="Report run" open={Boolean(runId)} onClose={onClose}>
      <QuerySection
        query={query}
        title="run"
        loading={<Skeleton className="h-60" />}
      >
        {(detail) => (
          <ReportRunCard run={detail.run} events={detail.events}>
            {canRun && detail.run.status === "FAILED" ? (
              <GeneralButton
                disabled={retry.isPending}
                onClick={() => {
                  void retry
                    .mutateAsync({
                      runId: detail.run.id,
                      idempotencyKey: retryKey.current,
                    })
                    .then(() => {
                      retryKey.current = crypto.randomUUID();
                      onClose();
                    })
                    .catch(() => undefined);
                }}
              >
                Retry generation
              </GeneralButton>
            ) : null}
            <ReportRunArtifacts
              artifacts={detail.artifacts}
              canDownload={canDownload}
              downloading={download.isPending}
              onDownload={(artifact) => void downloadArtifact(artifact)}
            />
            {detail.run.status === "FAILED" &&
            !detail.artifacts.some((artifact) => artifact.kind === "ERROR") ? (
              <p className="text-sm text-brand-navy/60">
                Error file persistence is pending.
              </p>
            ) : null}
          </ReportRunCard>
        )}
      </QuerySection>
    </RightDrawer>
  );
}
