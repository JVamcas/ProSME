import { describe, expect, it } from "vitest";
import { workflowActionNotificationSchema } from "@/modules/workflows/domain/actions/WorkflowActionNotification";
import { workflowActionDefinitionSchema } from "@/modules/workflows/domain/actions/WorkflowActionSchemas";
import {
  workflowActionFormDefaults,
  toWorkflowActionDefinition,
} from "@/modules/workflows/ui/definitions/WorkflowActionFormMapping";
import { renderWorkflowActionEmail } from "@/modules/notifications/application/WorkflowActionEmailContent";

const row = {
  id: "10000000-0000-4000-8000-000000000001",
  condition: null,
  recipientType: "APPLICATION_OWNER" as const,
  recipientId: null,
  subject: "Decision for {{fundingcalltitle}}",
  body: "<p>Hello <strong>{{recipientname}}</strong>. {{applicationreference}}</p>",
};
const action = {
  actionType: "APPROVE_ADVANCE" as const,
  stableKey: "ADVANCE",
  label: "Advance",
  enabled: true,
  reasonRequired: false,
  displayOrder: 1,
  configuration: {},
  notifications: [row],
};
const context = {
  applicationId: row.id,
  applicationReference: "SME-001",
  fundingOpportunityTitle: "Growth & Trade",
  stageName: "Assessment",
  actionLabel: "Advance",
  actorName: "Reviewer",
  subjectTemplate: row.subject,
  htmlTemplate: row.body,
  plainTextTemplate: "Hello {{recipientname}}. {{applicationreference}}",
};

describe("workflow action notifications", () => {
  it("round trips rows through the action schema and editor mapping", () => {
    const parsed = workflowActionDefinitionSchema.parse(action);
    expect(
      toWorkflowActionDefinition(workflowActionFormDefaults(parsed, 1)),
    ).toEqual(action);
    expect(parsed.notifications?.[0].condition).toBeNull();
  });

  it("rejects duplicate row IDs and unsupported template parameters", () => {
    expect(
      workflowActionDefinitionSchema.safeParse({
        ...action,
        notifications: [row, row],
      }).success,
    ).toBe(false);
    for (const subject of [
      "{{unknown}}",
      "{{ fundingcalltitle",
      "Hello\r\nBcc: someone",
    ]) {
      expect(
        workflowActionNotificationSchema.safeParse({ ...row, subject }).success,
      ).toBe(false);
    }
    expect(
      workflowActionNotificationSchema.safeParse({
        ...row,
        body: "{{unknown}}",
      }).success,
    ).toBe(false);
  });

  it("requires targets for selected users or roles and rejects targets for relationships", () => {
    for (const recipientType of ["SPECIFIC_USER", "SPECIFIC_ROLE"]) {
      expect(
        workflowActionNotificationSchema.safeParse({ ...row, recipientType })
          .success,
      ).toBe(false);
      expect(
        workflowActionNotificationSchema.safeParse({
          ...row,
          recipientType,
          recipientId: row.id,
        }).success,
      ).toBe(true);
    }
    expect(
      workflowActionNotificationSchema.safeParse({
        ...row,
        recipientId: row.id,
      }).success,
    ).toBe(false);
  });

  it("sanitizes markup on all definition writes and rejects empty rich text", () => {
    const result = workflowActionNotificationSchema.parse({
      ...row,
      body: '<p onclick="evil()">Hello</p><script>evil()</script>',
    });
    expect(result.body).toBe("<p>Hello</p>");
    for (const body of [
      "<p></p>",
      "<p>&nbsp;</p>",
      "<script>evil()</script>",
    ]) {
      expect(
        workflowActionNotificationSchema.safeParse({ ...row, body }).success,
      ).toBe(false);
    }
  });

  it("renders both fields, preserves rich text, and escapes parameter values in HTML", () => {
    const result = renderWorkflowActionEmail(
      context,
      '<img src=x onerror="evil()">',
    );
    expect(result.subject).toBe("Decision for Growth & Trade");
    expect(result.html).toContain("<strong>&lt;img");
    expect(result.html).not.toContain("<img");
    expect(result.plainText).toContain("SME-001");
    expect(renderWorkflowActionEmail(context, "Alice").html).toContain(
      "<strong>Alice</strong>",
    );
  });

  it("rejects missing parameter values and subject header injection from data", () => {
    expect(() =>
      renderWorkflowActionEmail(
        { ...context, fundingOpportunityTitle: "" },
        "Alice",
      ),
    ).toThrow();
    expect(() =>
      renderWorkflowActionEmail(
        { ...context, fundingOpportunityTitle: "Growth\nBcc:someone" },
        "Alice",
      ),
    ).toThrow("newlines");
  });
});
