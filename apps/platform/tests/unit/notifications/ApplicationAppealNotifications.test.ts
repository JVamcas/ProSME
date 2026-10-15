import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/notifications/infrastructure/ApplicationAppealNotificationRepository",
  () => ({
    insertAppealAcknowledgement: vi.fn(),
    appealDeliveryAuthorized: vi.fn(),
  }),
);
vi.mock(
  "@/modules/notifications/application/ServerNotificationOccurrenceService",
  () => ({ captureNotificationOccurrence: vi.fn() }),
);
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ APP_PUBLIC_URL: "https://fund.example" }),
}));
vi.mock(
  "@/modules/notifications/application/ServerNotificationEmailBranding",
  () => ({ notificationBrandingLogoUrl: "cid:sme-fund-branding-logo" }),
);
import {
  captureApplicationAppealNotifications,
  requireAppealDeliveryRecipient,
  renderAppealAcknowledgement,
} from "@/modules/notifications/application/ApplicationAppealNotifications";
import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import {
  insertAppealAcknowledgement,
  appealDeliveryAuthorized,
} from "@/modules/notifications/infrastructure/ApplicationAppealNotificationRepository";
import { buildNotificationRenderValues } from "@/modules/notifications/domain/NotificationRenderValues";
import { notificationEventCatalogue } from "@/modules/notifications/domain/NotificationEvent";
import { applicationAppealFields } from "@/modules/notifications/domain/NotificationApplicationAppealEvent";
import { relationshipRecipientTypesForEvent } from "@/modules/notifications/domain/NotificationRecipient";
import { renderNotificationTemplate } from "@/modules/notifications/application/NotificationTemplateRenderer";
import type { ClaimedNotificationDelivery } from "@/modules/notifications/infrastructure/NotificationDispatchRepository";
import type { DatabaseTransaction } from "@/platform/database/client";
const context = {
  appealId: "a1111111-1111-4111-8111-111111111111",
  appealReference: "APL-000001",
  applicationId: "a2222222-2222-4222-8222-222222222222",
  applicationReference: "CALL-2026-000001",
  occurredAt: "2026-10-15T10:00:00.000Z",
};
const delivery = {
  eventKey: "application.appeal.acknowledged",
  context,
  recipientName: "Appeal sender",
  recipientEmail: "sender@example.test",
  recipientUserId: null,
  htmlTemplate: null,
  plainTextTemplate: null,
  subjectTemplate: null,
} as ClaimedNotificationDelivery;
describe("application appeal email delivery", () => {
  it("keeps acknowledgement automatic and staff subscriptions configurable", () => {
    expect(
      notificationEventCatalogue["application.appeal.received"].ruleEligibility,
    ).toBe("CONFIGURABLE");
    expect(
      notificationEventCatalogue["application.appeal.acknowledged"]
        .ruleEligibility,
    ).toBe("SYSTEM_ONLY");
    expect(
      relationshipRecipientTypesForEvent("application.appeal.received"),
    ).toEqual([]);
  });
  it("captures the submitter acknowledgement and the subscribable staff event in the same transaction", async () => {
    const transaction = {} as DatabaseTransaction;
    const recipient = { name: "Appeal sender", email: "sender@example.test" };
    await captureApplicationAppealNotifications(
      transaction,
      context,
      recipient,
    );
    expect(insertAppealAcknowledgement).toHaveBeenCalledWith(
      transaction,
      context,
      recipient,
    );
    expect(captureNotificationOccurrence).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        eventKey: "application.appeal.received",
        context,
        recipients: [],
      }),
    );
  });
  it("renders an acknowledgement for a submitter without a platform user", async () => {
    const result = await renderAppealAcknowledgement(delivery);
    expect(result.subject).toContain(context.appealReference);
    expect(result.html).toContain("Your appeal has been received");
    expect(result.html).toContain("cid:sme-fund-branding-logo");
    expect(result.html).toContain("https://fund.example/contact");
    expect(result.html).not.toContain("/admin/");
  });
  it("uses the existing email structure and safe staff links", async () => {
    const htmlTemplate = await readFile(
      new URL(
        "../../../src/modules/notifications/templates/email/application-appeal-received.html",
        import.meta.url,
      ),
      "utf8",
    );
    const values = buildNotificationRenderValues({
      eventKey: "application.appeal.received",
      context,
      publicApplicationUrl: "https://fund.example",
      recipient: { displayName: "Staff <One>", userId: context.applicationId },
    });
    const result = renderNotificationTemplate(
      {
        htmlTemplate,
        subjectTemplate: "New appeal {{appealReference}}",
        plainTextTemplate: "{{appealUrl}}",
      },
      applicationAppealFields,
      { ...values, brandingLogoUrl: "cid:sme-fund-branding-logo" },
    );
    expect(result.html).toContain('role="presentation"');
    expect(result.html).toContain("Staff &lt;One&gt;");
    expect(result.html).toContain(
      `/admin/process-monitor/application-appeals/${context.appealId}`,
    );
    expect(result.html).not.toContain("{{");
  });
  it("blocks delivery when the recipient no longer has access or a subscription", async () => {
    vi.mocked(appealDeliveryAuthorized).mockResolvedValue(false);
    await expect(
      requireAppealDeliveryRecipient({
        ...delivery,
        recipientUserId: context.applicationId,
      }),
    ).rejects.toThrow("cannot access");
    vi.mocked(appealDeliveryAuthorized).mockResolvedValue(true);
    await expect(
      requireAppealDeliveryRecipient({
        ...delivery,
        recipientUserId: context.applicationId,
      }),
    ).resolves.toBeUndefined();
  });
});
