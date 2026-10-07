import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/notifications/infrastructure/WebsiteReportRecipientRepository",
  () => ({ isCurrentWebsiteReportRecipient: vi.fn() }),
);
import { isCurrentWebsiteReportRecipient } from "@/modules/notifications/infrastructure/WebsiteReportRecipientRepository";
import { requireCurrentWebsiteReportRecipient } from "@/modules/notifications/application/ServerWebsiteReportDeliveryPolicy";
import { renderNotificationTemplate } from "@/modules/notifications/application/NotificationTemplateRenderer";
import { websiteReportEmailTemplate } from "@/modules/notifications/domain/WebsiteReportEmailTemplate";
import {
  websiteReportNotificationFields,
  websiteReportRenderValues,
} from "@/modules/notifications/domain/NotificationWebsiteReportEvent";
import { parseNotificationContext } from "@/modules/notifications/domain/NotificationEvent";

const delivery = {
  eventKey: "reporting.website.monthly",
  recipientUserId: "10000000-0000-4000-8000-000000000001",
  recipientEmail: "reader@example.test",
};
beforeEach(() => vi.clearAllMocks());
describe("website report email policy and rendering", () => {
  it("rechecks designated-recipient permission on each delivery attempt", async () => {
    vi.mocked(isCurrentWebsiteReportRecipient).mockResolvedValue(true);
    await expect(
      requireCurrentWebsiteReportRecipient(delivery),
    ).resolves.toBeUndefined();
    vi.mocked(isCurrentWebsiteReportRecipient).mockResolvedValue(false);
    await expect(
      requireCurrentWebsiteReportRecipient(delivery),
    ).rejects.toThrow("no longer active");
    expect(isCurrentWebsiteReportRecipient).toHaveBeenCalledTimes(2);
  });
  it("denies deleted users and preserves other notification behavior", async () => {
    await expect(
      requireCurrentWebsiteReportRecipient({
        ...delivery,
        recipientUserId: null,
      }),
    ).rejects.toThrow();
    await expect(
      requireCurrentWebsiteReportRecipient({
        ...delivery,
        eventKey: "application.submitted",
      }),
    ).resolves.toBeUndefined();
    expect(isCurrentWebsiteReportRecipient).not.toHaveBeenCalled();
  });
  it("renders escaped HTML, matching plain text and an authorized saved-report link", () => {
    const context = parseNotificationContext("reporting.website.monthly", {
      reportId: delivery.recipientUserId,
      frequency: "MONTHLY",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      timezone: "Africa/Windhoek",
      generatedAt: "2026-10-03T07:00:00.000Z",
      reportSummary: "Visitors: 123\n<script>alert(1)</script>",
      sourceNotes: "Sampled; consenting visitors only.",
    });
    const rendered = renderNotificationTemplate(
      websiteReportEmailTemplate,
      websiteReportNotificationFields,
      {
        ...websiteReportRenderValues(context, "https://example.test"),
        brandingLogoUrl: "cid:brand",
        platformName: "SME Fund Namibia",
        recipientName: "Report reader",
      },
    );
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.plainText).toContain(context.reportSummary);
    expect(rendered.html).toContain(
      `/admin/reports/website/${context.reportId}`,
    );
    expect(rendered.subject).toContain("Monthly website report");
  });
});
