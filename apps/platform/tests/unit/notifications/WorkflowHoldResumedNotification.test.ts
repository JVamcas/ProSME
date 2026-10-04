import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildNotificationRenderValues } from "@/modules/notifications/domain/NotificationTemplateFields";
import { workflowHoldResumedContextSchema } from "@/modules/notifications/domain/NotificationWorkflowHoldEvent";
import { relationshipRecipientTypesForEvent } from "@/modules/notifications/domain/NotificationRecipient";

const user = {
  userId: "00000000-0000-4000-8000-000000000001",
  displayName: "Reviewer",
  email: "reviewer@example.test",
};
const context = workflowHoldResumedContextSchema.parse({
  applicationId: user.userId,
  applicationReference: "SME-7",
  assignees: [],
  correlationId: "hold-resumption-test",
  deadlineAt: null,
  fundingOpportunityTitle: "Growth Fund",
  kind: "HOLD_RESUMED",
  occurredAt: "2026-10-04T10:00:00Z",
  owner: user,
  holder: user,
  question: null,
  scheduledFor: "2026-10-04T00:00:00Z",
  sourceId: "00000000-0000-4000-8000-000000000002",
  sourceIdempotencyKey: "hold-resumed-test",
  stageInstanceId: user.userId,
  stageName: "Screening",
  workflowInstanceId: user.userId,
  scope: "STAGE",
  processingStillHeld: false,
});

describe("hold resumption notification", () => {
  it.each([true, false])(
    "explains remaining holds: %s",
    (processingStillHeld) => {
      const values = buildNotificationRenderValues({
        context: { ...context, processingStillHeld },
        eventKey: "workflow.hold.resumed",
        publicApplicationUrl: "https://fund.example.test",
        recipient: user,
      });
      expect(values.holdScope).toBe("This stage");
      expect(values.resumptionStatus).toContain(
        processingStillHeld ? "Other holds still apply" : "Work can continue",
      );
      expect(values.workQueueUrl).toBe(
        "https://fund.example.test/admin/work-queue",
      );
    },
  );

  it("offers the initiator as the event relationship recipient", () => {
    expect(relationshipRecipientTypesForEvent("workflow.hold.resumed")).toEqual(
      ["ACTION_ACTOR"],
    );
    expect(
      relationshipRecipientTypesForEvent("workflow.task.assigned"),
    ).not.toContain("ACTION_ACTOR");
  });

  it("installs the exact HTML asset with existing branded email structure", () => {
    const html = readFileSync(
      "src/modules/notifications/templates/email/workflow-hold-resumed.html",
      "utf8",
    );
    const migration = readFileSync(
      "drizzle/0159_workflow_hold_scopes.sql",
      "utf8",
    );
    const baseline = readFileSync(
      "src/modules/notifications/templates/email/workflow-deferral-resumed.html",
      "utf8",
    );
    expect(html.match(/<table\b/g)?.length).toBe(
      baseline.match(/<table\b/g)?.length,
    );
    expect(html).toContain('src="{{brandingLogoUrl}}"');
    expect(html).toContain('bgcolor="#0A183B"');
    expect(html).toContain("width:100%;max-width:600px");
    expect(html).toContain("{{resumptionStatus}}");
    expect(migration).toContain(`$hold_html$${html}$hold_html$`);
    expect(migration).toContain(
      createHash("sha256").update(html).digest("hex"),
    );
  });
});
