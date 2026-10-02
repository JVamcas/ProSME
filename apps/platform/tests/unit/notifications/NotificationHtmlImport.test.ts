import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  maximumNotificationTemplateBytes,
  validateNotificationHtmlImport,
} from "@/modules/notifications/application/NotificationHtmlImport";
import {
  notificationEventTemplateFields,
} from "@/modules/notifications/domain/NotificationTemplateFields";

const encode = (value: string) => new TextEncoder().encode(value);

function validate(html: string, overrides: Partial<{
  bytes: Uint8Array;
  fileName: string;
  mediaType: string;
  plainTextTemplate: string;
  subjectTemplate: string;
}> = {}) {
  return validateNotificationHtmlImport({
    bytes: encode(html),
    fileName: "template.html",
    mediaType: "text/html",
    subjectTemplate: "Hello {{recipientName}}",
    ...overrides,
  }, notificationEventTemplateFields["application.submitted"]);
}

describe("notification HTML import", () => {
  it("keeps every source template logo-enabled with a resilient CTA", async () => {
    const directory = path.join(
      process.cwd(),
      "src/modules/notifications/templates/email",
    );
    const files = (await readdir(directory)).filter((file) =>
      file.endsWith(".html")
    );

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const html = await readFile(path.join(directory, file), "utf8");
      expect(html, `${file} must use the shared branding logo`).toContain(
        'src="{{brandingLogoUrl}}"',
      );
      expect(html, `${file} must preserve the CTA cell background`).toContain(
        'bgcolor="#0A183B"',
      );
      expect(html, `${file} must style the CTA link background`).toContain(
        "background-color:#0a183b",
      );
    }
  });

  it("sanitizes branded HTML, generates text, and produces a stable digest", () => {
    const first = validate('<div class="email"><h1>Hello {{recipientName}}</h1></div>');
    const second = validate('<div class="email"><h1>Hello {{recipientName}}</h1></div>');
    expect(first.htmlTemplate).toContain("Hello {{recipientName}}");
    expect(first.plainTextTemplate).toBe("Hello {{recipientName}}");
    expect(first.contentSha256).toBe(second.contentSha256);
    expect(first.contentSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each([
    "<script>alert(1)</script><p>Hello</p>",
    "<form action=\"https://evil.example\"><input></form>",
    "<p onclick=\"alert(1)\">Hello</p>",
    "<a href=\"javascript:alert(1)\">Hello</a>",
    "<div style=\"background:url(https://evil.example/pixel)\">Hello</div>",
  ])("rejects executable markup: %s", (html) => {
    expect(() => validate(html)).toThrow("executable or unsupported HTML");
  });

  it("rejects type, size, encoding, and subject boundaries", () => {
    expect(() => validate("<p>Hello</p>", { fileName: "template.txt" }))
      .toThrow("Only .html");
    expect(() => validate("<p>Hello</p>", { mediaType: "text/plain" }))
      .toThrow("text/html");
    expect(() => validate("", { bytes: new Uint8Array(maximumNotificationTemplateBytes + 1) }))
      .toThrow("256 KiB");
    expect(() => validate("", { bytes: new Uint8Array([0xc3, 0x28]) }))
      .toThrow("UTF-8");
    expect(() => validate("<p>Hello</p>", { subjectTemplate: "Hello\nBcc: bad@example.com" }))
      .toThrow("cannot contain newlines");
  });

  it.each([
    [
      "workflow-sla-breached.html",
      "workflow.sla.breached",
      "Review overdue for application {{applicationReference}}",
    ],
    [
      "information-request-reminder.html",
      "workflow.information-request.reminder",
      "Reminder: information needed for application {{applicationReference}}",
    ],
    [
      "workflow-hold-review-due.html",
      "workflow.hold.review-due",
      "Time to review application {{applicationReference}} on hold",
    ],
    [
      "workflow-deferral-resumed.html",
      "workflow.deferral.resumed",
      "Review resumed for application {{applicationReference}}",
    ],
    [
      "application-terminal-status-reached.html",
      "application.terminal-status-reached",
      "Application {{applicationReference}}: {{statusLabel}}",
    ],
    [
      "auth-email-verification.html",
      "auth.email.verification",
      "Verify your email for {{platformName}}",
    ],
    [
      "auth-password-reset.html",
      "auth.password.reset",
      "Reset your password for {{platformName}}",
    ],
    [
      "application-submitted.html",
      "application.submitted",
      "Application {{applicationReference}} received",
    ],
    [
      "workflow-task-assigned.html",
      "workflow.task.assigned",
      "Tasks assigned for {{applicationReference}}",
    ],
    [
      "information-request-created.html",
      "workflow.information-request.created",
      "Information requested for {{applicationReference}}",
    ],
    [
      "information-request-responded.html",
      "workflow.information-request.responded",
      "Response received for {{applicationReference}}",
    ],
    [
      "information-request-closed.html",
      "workflow.information-request.closed",
      "Information request closed for {{applicationReference}}",
    ],
    [
      "information-request-expired.html",
      "workflow.information-request.expired",
      "Information request expired for {{applicationReference}}",
    ],
  ] as const)("validates source template %s", async (
    fileName,
    eventKey,
    subjectTemplate,
  ) => {
    const bytes = await readFile(path.join(
      process.cwd(),
      "src/modules/notifications/templates/email",
      fileName,
    ));
    const validated = validateNotificationHtmlImport({
      bytes,
      fileName,
      mediaType: "text/html",
      subjectTemplate,
    }, notificationEventTemplateFields[eventKey]);
    expect(validated.htmlTemplate).not.toMatch(/<script|<form|\son[a-z]+=/i);
    expect(validated.plainTextTemplate.length).toBeGreaterThan(30);
    expect(validated.htmlTemplate).toContain('bgcolor="#0A183B"');
    expect(validated.htmlTemplate).toContain("background-color:#0a183b");
  });
});
