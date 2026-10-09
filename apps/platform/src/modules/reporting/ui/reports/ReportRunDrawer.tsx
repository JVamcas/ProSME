"use client";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { GeneralButton } from "@/components/ui/button";
import { useDownloadReportArtifact, useReportRunDetail } from "./useReports";

export function ReportRunDrawer({
  reportId,
  runId,
  onClose,
  canDownload,
}: {
  reportId: string;
  runId?: string;
  onClose: () => void;
  canDownload: boolean;
}) {
  const download = useDownloadReportArtifact(reportId);
  const query = useReportRunDetail(reportId, runId);
  return (
    <RightDrawer title="Report run" open={Boolean(runId)} onClose={onClose}>
      <QuerySection
        query={query}
        title="run"
        loading={<Skeleton className="h-60" />}
      >
        {(detail) => (
          <div className="space-y-4">
            <p>
              {detail.run.status} · {detail.run.format} ·{" "}
              {detail.run.rows ?? "—"} rows
            </p>
            <p>
              Template v{detail.run.templateVersion} · report v
              {detail.run.reportVersion} · {detail.run.timezone}
            </p>
            {detail.run.error ? <p role="alert">{detail.run.error}</p> : null}
            {detail.artifacts.map((artifact) => (
              <div key={artifact.id}>
                {canDownload ? (
                  <GeneralButton
                    variant="outline"
                    disabled={download.isPending}
                    onClick={() => {
                      void download
                        .mutateAsync({
                          runId: detail.run.id,
                          artifactId: artifact.id,
                        })
                        .then((blob) => {
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = artifact.filename;
                          link.click();
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        })
                        .catch(() => undefined);
                    }}
                  >
                    {artifact.filename}
                  </GeneralButton>
                ) : (
                  <p>{artifact.filename}</p>
                )}
                <p className="text-xs">
                  {artifact.bytes} bytes · SHA-256 {artifact.checksum}
                </p>
              </div>
            ))}
            {detail.run.status === "FAILED" &&
            !detail.artifacts.some((artifact) => artifact.kind === "ERROR") ? (
              <p>Error file persistence is pending.</p>
            ) : null}
            <h3 className="font-semibold">Lifecycle</h3>
            {detail.events.map((event) => (
              <p key={event.key}>
                {event.key} · {new Date(event.occurredAt).toLocaleString()}
              </p>
            ))}
            <h3 className="font-semibold">Resolved parameters</h3>
            <dl>
              {Object.entries(detail.run.values).map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value === null ? "No value" : String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </QuerySection>
    </RightDrawer>
  );
}
