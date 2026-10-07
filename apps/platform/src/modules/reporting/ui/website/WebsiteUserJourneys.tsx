import type {
  AnalyticsSourceResult,
  WebsiteOrderedFunnel,
} from "../../domain/WebsiteAnalyticsMetrics";
import type { WebsiteSelfCheckJourney } from "../../domain/WebsiteAnalyticsPanels";
import { analyticsCount } from "./WebsiteAnalyticsFormatting";
import { WebsiteAnalyticsPanel } from "./WebsiteAnalyticsPanel";

export function WebsiteUserJourneys({
  application,
  selfCheck,
  scope,
}: {
  application: AnalyticsSourceResult<WebsiteOrderedFunnel>;
  selfCheck: AnalyticsSourceResult<WebsiteSelfCheckJourney>;
  scope: string;
}) {
  return (
    <section className="grid min-w-0 gap-3">
      <h2 className="text-lg font-bold text-brand-navy">
        Observed user journeys
      </h2>
      <WebsiteAnalyticsPanel
        title="View → eligibility check → start → submit"
        headingLevel={3}
        scope={scope}
        result={application}
      >
        {(value) => (
          <p className="text-sm">
            {analyticsCount(value.submittedUsers)} tracked users completed this
            ordered path.
          </p>
        )}
      </WebsiteAnalyticsPanel>
      <WebsiteAnalyticsPanel
        title="Call viewed → eligibility self-check completed"
        headingLevel={3}
        scope={scope}
        result={selfCheck}
      >
        {(value) => (
          <p className="text-sm">
            {analyticsCount(value.completedSelfCheckUsers)} tracked users
            completed this ordered path.
          </p>
        )}
      </WebsiteAnalyticsPanel>
    </section>
  );
}
