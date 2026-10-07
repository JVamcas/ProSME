"use client";
import { GeneralButtonLink } from "@/components/ui/button";
import { PageShell } from "@/shared/ui/PageShell";
import { QuerySection } from "@/shared/ui/QuerySection";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { WebsiteAnalyticsMetrics } from "../website/WebsiteAnalyticsMetrics";
import { WebsiteReportSourceTable } from "./WebsiteReportSourceTable";
import { useWebsiteReport } from "./useWebsiteReports";

export function WebsiteReportDetailWorkspace({
  reportId,
}: {
  reportId: string;
}) {
  const query = useWebsiteReport(reportId);
  const report = query.data;
  return (
    <PageShell
      title="Saved website report"
      description={
        report
          ? `${report.startDate} to ${report.endDate} · ${report.timezone}`
          : "Immutable period snapshot"
      }
      eyebrow="Operations / Reporting"
    >
      <GeneralButtonLink
        href="/admin/reports/website"
        variant="outline"
        size="compact"
      >
        Back to report history
      </GeneralButtonLink>
      <QuerySection
        query={query}
        title="saved website report"
        loading={<PortalLoadingState title="" description="Just a moment..." />}
      >
        {(report) => (
          <div className="space-y-6">
            <p className="text-sm text-brand-navy/65">
              Generation: {report.state} · Email delivery:{" "}
              {report.deliveryState ?? "Waiting"} · Generated:{" "}
              {report.generatedAt ?? "Pending"}
            </p>
            {report.note ? <p role="status">{report.note}</p> : null}
            {report.snapshot ? (
              <>
                <WebsiteAnalyticsMetrics data={report.snapshot.metrics} />
                <WebsiteReportSourceTable metrics={report.snapshot.metrics} />
                <section className="rounded-2xl border border-brand-navy/10 bg-white p-6">
                  <h2 className="mb-4 text-xl font-bold text-brand-navy">
                    Report summary
                  </h2>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7">
                    {report.snapshot.summary}
                  </pre>
                </section>
                <section className="rounded-2xl border border-brand-navy/10 bg-white p-6">
                  <h2 className="mb-4 text-xl font-bold text-brand-navy">
                    Sources and coverage
                  </h2>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7">
                    {report.snapshot.sourceNotes}
                  </pre>
                </section>
              </>
            ) : null}
          </div>
        )}
      </QuerySection>
    </PageShell>
  );
}
