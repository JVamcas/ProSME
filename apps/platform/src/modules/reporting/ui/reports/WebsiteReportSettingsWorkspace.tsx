"use client";
import { GeneralButtonLink } from "@/components/ui/button";
import { PageShell } from "@/shared/ui/PageShell";
import { QuerySection } from "@/shared/ui/QuerySection";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { NotificationRuleDeliveryConfiguration } from "@/modules/notifications/ui/NotificationRuleDeliveryConfiguration";
import { WebsiteReportScheduleForm } from "./WebsiteReportScheduleForm";
import { useWebsiteReportSettings } from "./useWebsiteReports";

export function WebsiteReportSettingsWorkspace({
  canUpdate,
  canReadRecipients,
  canUpdateRecipients,
}: {
  canUpdate: boolean;
  canReadRecipients: boolean;
  canUpdateRecipients: boolean;
}) {
  const query = useWebsiteReportSettings();
  return (
    <PageShell
      title="Report settings"
      description="Configure website reporting periods, send times and designated recipients"
      eyebrow="Operations / Reporting"
    >
      <GeneralButtonLink
        variant="outline"
        size="compact"
        href="/admin/reports/website"
      >
        View saved website reports
      </GeneralButtonLink>
      <QuerySection
        query={query}
        title="report settings"
        loading={<PortalLoadingState title="" description="Just a moment..." />}
      >
        {(settings) =>
          settings.schedules.map((schedule) => (
            <section
              key={schedule.id}
              className="space-y-6 rounded-2xl border border-brand-navy/10 bg-white p-6"
            >
              <h2 className="text-xl font-bold text-brand-navy">
                {schedule.frequency === "BIWEEKLY"
                  ? "R1 · Bi-weekly website report"
                  : "R2 · Monthly website report"}
              </h2>
              <WebsiteReportScheduleForm
                schedule={schedule}
                canUpdate={canUpdate}
                collectionStart={settings.collectionStart}
                propertyTimezone={settings.propertyTimezone}
              />
              {canReadRecipients ? (
                <NotificationRuleDeliveryConfiguration
                  eventKey={schedule.eventKey}
                  canUpdate={canUpdateRecipients}
                />
              ) : (
                <p className="text-sm text-brand-navy/65">
                  Notification configuration permission is required to view or
                  edit delivery recipients.
                </p>
              )}
            </section>
          ))
        }
      </QuerySection>
    </PageShell>
  );
}
