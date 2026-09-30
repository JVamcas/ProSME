import { describe, expect, it } from "vitest";

import {
  discoverNotificationPlaceholders,
  renderNotificationTemplate,
  validateNotificationPlaceholders,
} from "@/modules/notifications/application/NotificationTemplateRenderer";
import {
  buildNotificationRenderValues,
  notificationEventTemplateFields,
} from "@/modules/notifications/domain/NotificationTemplateFields";

const content = {
  htmlTemplate: "<p>Hello {{recipientName}} — {{applicationReference}}</p>",
  plainTextTemplate: "Hello {{recipientName}} — {{applicationReference}}",
  subjectTemplate: "Application {{applicationReference}}",
};

describe("notification template renderer", () => {
  it("discovers and renders supported placeholders deterministically", () => {
    expect(discoverNotificationPlaceholders("{{recipientName}} {{ recipientName }} {{platformName}}"))
      .toEqual(["platformName", "recipientName"]);
    expect(renderNotificationTemplate(
      content,
      notificationEventTemplateFields["application.submitted"],
      { applicationReference: "SME Fund-7", recipientName: "Nela" },
    )).toEqual({
      html: "<p>Hello Nela — SME Fund-7</p>",
      plainText: "Hello Nela — SME Fund-7",
      subject: "Application SME Fund-7",
    });
  });

  it("rejects unsupported fields and malformed expressions", () => {
    expect(() => validateNotificationPlaceholders(
      { ...content, htmlTemplate: "{{recipient.password}}" },
      ["recipientName", "applicationReference"],
    )).toThrow("{{fieldName}} syntax");
    expect(() => validateNotificationPlaceholders(
      { ...content, htmlTemplate: "{{secretField}}" },
      ["recipientName", "applicationReference"],
    )).toThrow("Unsupported template fields: secretField");
  });

  it("escapes recipient values in HTML", () => {
    const rendered = renderNotificationTemplate(
      content,
      notificationEventTemplateFields["application.submitted"],
      {
        applicationReference: "SME Fund-7",
        recipientName: '<img src=x onerror="alert(1)">',
      },
    );
    expect(rendered.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(rendered.html).not.toContain("<img");
  });

  it("rejects subject injection and missing required values", () => {
    expect(() => renderNotificationTemplate(
      content,
      notificationEventTemplateFields["application.submitted"],
      { applicationReference: "SME Fund-7\nBcc: attacker@example.com", recipientName: "Nela" },
    )).toThrow("subjects cannot contain newlines");
    expect(() => renderNotificationTemplate(
      content,
      notificationEventTemplateFields["application.submitted"],
      { recipientName: "Nela" },
    )).toThrow("Missing required notification value: applicationReference");
  });

  it("constructs trusted application URLs from the supplied server base", () => {
    const values = buildNotificationRenderValues({
      context: {
        applicationId: "00000000-0000-4000-8000-000000000001",
        applicationOwnerUserId: "00000000-0000-4000-8000-000000000002",
        applicationReference: "SME Fund-7",
        correlationId: "correlation-1",
        fundingOpportunityTitle: "Growth Fund",
        ownerDisplayName: "Nela",
        ownerEmail: "nela@example.com",
        sourceIdempotencyKey: "submission-1",
        submittedAt: "2026-09-27T10:00:00+02:00",
        workflowInstanceId: "00000000-0000-4000-8000-000000000003",
      },
      eventKey: "application.submitted",
      publicApplicationUrl: "https://fund.example/base/",
      recipient: {
        displayName: "Nela",
        userId: "00000000-0000-4000-8000-000000000002",
      },
    });
    expect(values.applicationUrl).toBe(
      "https://fund.example/portal/applications/00000000-0000-4000-8000-000000000001",
    );
  });

  it("constructs the applicant information-request URL", () => {
    const values = buildNotificationRenderValues({
      context: {
        applicationId: "00000000-0000-4000-8000-000000000001",
        applicationReference: "SME Fund-8",
        assignees: [],
        correlationId: "rfi-correlation-1",
        createdAt: "2026-09-27T10:00:00+02:00",
        deadlineAt: "2026-10-04T10:00:00+02:00",
        fundingOpportunityTitle: "Growth Fund",
        owner: {
          displayName: "Nela",
          email: "nela@example.com",
          userId: "00000000-0000-4000-8000-000000000002",
        },
        question: "Please provide updated accounts.",
        requestInformationId: "00000000-0000-4000-8000-000000000004",
        sourceIdempotencyKey: "rfi-created-1",
        workflowInstanceId: "00000000-0000-4000-8000-000000000003",
      },
      eventKey: "workflow.information-request.created",
      publicApplicationUrl: "https://fund.example/base/",
      recipient: {
        displayName: "Nela",
        userId: "00000000-0000-4000-8000-000000000002",
      },
    });
    expect(values.informationRequestUrl).toBe(
      "https://fund.example/portal/applications/00000000-0000-4000-8000-000000000001/requests/00000000-0000-4000-8000-000000000004",
    );
  });
});
