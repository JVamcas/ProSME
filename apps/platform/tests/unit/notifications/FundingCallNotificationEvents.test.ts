import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  notificationEventKeys,
  parseNotificationContext,
  type FundingCallLifecycleContext,
  type NotificationEventKey,
} from "@/modules/notifications/domain/NotificationEvent";
import { validateNotificationHtmlImport } from "@/modules/notifications/application/NotificationHtmlImport";
import {
  buildNotificationRenderValues,
  notificationEventTemplateFields,
} from "@/modules/notifications/domain/NotificationTemplateFields";

const events = [
  "funding-call.approval-requested",
  "funding-call.returned-for-amendment",
  "funding-call.approved",
  "funding-call.approval-request-withdrawn",
  "funding-call.published",
  "funding-call.opened",
  "funding-call.suspended",
  "funding-call.resumed",
  "funding-call.closed",
  "funding-call.withdrawn",
  "funding-call.archived",
] as const satisfies readonly NotificationEventKey[];

const context: FundingCallLifecycleContext = {
  correlationId: "correlation-id",
  excludedRecipientUserIds: [],
  fundingCallId: "40000000-0000-4000-8000-000000000001",
  fundingCallReference: "SME Fund-2027-01",
  fundingCallTitle: "SME Fund Growth Fund 2027",
  occurredAt: "2027-02-01T06:00:00.000Z",
  reason: "Operational decision",
  sourceIdempotencyKey: "command-id",
  sourceStatus: "SCHEDULED",
  targetStatus: "LIVE",
};

describe("funding call notification events", () => {
  it("registers and validates every lifecycle event", () => {
    for (const event of events) {
      expect(notificationEventKeys).toContain(event);
      expect(parseNotificationContext(event, context)).toEqual(context);
    }
  });

  it("renders the shared funding call fields and an admin link", () => {
    for (const eventKey of events) {
      expect(buildNotificationRenderValues({
        context,
        eventKey,
        publicApplicationUrl: "https://fund.example.test",
        recipient: {
          displayName: "Reviewer",
          userId: "10000000-0000-4000-8000-000000000001",
        },
      })).toMatchObject({
        fundingCallReference: context.fundingCallReference,
        fundingCallTitle: context.fundingCallTitle,
        fundingCallUrl:
          `https://fund.example.test/admin/funding-calls/${context.fundingCallId}`,
        recipientName: "Reviewer",
      });
    }
  });

  it("provides an HTML template for every event", () => {
    for (const event of events) {
      const fileName = `${event.replace("funding-call.", "funding-call-")}.html`;
      const html = readFileSync(path.resolve(
        process.cwd(),
        "src/modules/notifications/templates/email",
        fileName,
      ), "utf8");
      expect(html).toContain("{{platformName}}");
      expect(html).toContain("{{recipientName}}");
      expect(html).toContain("{{fundingCallReference}}");
      expect(html).toContain("{{fundingCallUrl}}");
      expect(validateNotificationHtmlImport({
        bytes: new TextEncoder().encode(html),
        fileName,
        mediaType: "text/html",
        subjectTemplate: "{{fundingCallReference}} lifecycle update",
      }, notificationEventTemplateFields[event]).detectedPlaceholders)
        .toContain("fundingCallReference");
    }
  });

  it("migrates the catalogue and stakeholder recipient constraints", () => {
    const migration = readFileSync(path.resolve(
      process.cwd(),
      "drizzle/0136_funding_call_notification_events.sql",
    ), "utf8");
    expect(migration).toContain("FUNDING_CALL_STAKEHOLDER");
    for (const event of events) expect(migration).toContain(event);
  });
});
