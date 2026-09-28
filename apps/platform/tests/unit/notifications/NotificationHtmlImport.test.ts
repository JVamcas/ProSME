import { readFile } from "node:fs/promises";
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
    ["application-submitted.html", "application.submitted"],
    ["workflow-task-assigned.html", "workflow.task.assigned"],
  ] as const)("validates initial source template %s", async (fileName, eventKey) => {
    const bytes = await readFile(path.join(
      process.cwd(),
      "src/modules/notifications/templates/email",
      fileName,
    ));
    const validated = validateNotificationHtmlImport({
      bytes,
      fileName,
      mediaType: "text/html",
      subjectTemplate: eventKey === "application.submitted"
        ? "Application {{applicationReference}} received"
        : "Tasks assigned for {{applicationReference}}",
    }, notificationEventTemplateFields[eventKey]);
    expect(validated.htmlTemplate).not.toMatch(/<script|<form|\son[a-z]+=/i);
    expect(validated.plainTextTemplate.length).toBeGreaterThan(30);
  });
});
