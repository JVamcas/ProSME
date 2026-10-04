import { createHash } from "node:crypto";
import sanitizeHtml from "sanitize-html";

import {
  notificationErrorCodes,
  NotificationValidationError,
} from "../domain/NotificationErrors";
import {
  validateNotificationPlaceholders,
} from "./NotificationTemplateRenderer";

export const maximumNotificationTemplateBytes = 256 * 1024;

export type NotificationHtmlImportInput = {
  bytes: Uint8Array;
  fileName: string;
  mediaType: string;
  plainTextTemplate?: string;
  subjectTemplate: string;
};

export type ValidatedNotificationTemplateImport = {
  contentSha256: string;
  detectedPlaceholders: string[];
  htmlTemplate: string;
  mediaType: "text/html";
  plainTextTemplate: string;
  sourceFileName: string;
  subjectTemplate: string;
};

const forbiddenMarkup = [
  /<(script|form|iframe|object|embed|svg|math|base)\b/i,
  /<meta\b[^>]*http-equiv\s*=\s*["\x27]?refresh/i,
  /\son[a-z]+\s*=/i,
  /(?:javascript|vbscript|data)\s*:/i,
  /(?:expression\s*\(|url\s*\(|@import|behavior\s*:)/i,
];

function invalidTemplate(message: string): never {
  throw new NotificationValidationError(
    notificationErrorCodes.templateInvalid,
    message,
  );
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return invalidTemplate("The template must contain valid UTF-8 text.");
  }
}

function assertSafeSource(html: string): void {
  if (forbiddenMarkup.some((pattern) => pattern.test(html))) {
    invalidTemplate(
      "The template contains executable or unsupported HTML content.",
    );
  }
}

export function sanitizeNotificationHtml(html: string): string {
  assertSafeSource(html);
  const sanitized = sanitizeHtml(html, {
    allowedAttributes: {
      "*": ["class", "style"],
      a: ["href", "target", "title"],
      img: ["alt", "height", "src", "width"],
      td: ["align", "bgcolor", "colspan", "rowspan", "valign"],
      th: ["align", "bgcolor", "colspan", "rowspan", "valign"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedTags: [
      "a",
      "b",
      "blockquote",
      "br",
      "div",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "hr",
      "img",
      "li",
      "ol",
      "p",
      "span",
      "strong",
      "table",
      "tbody",
      "td",
      "tfoot",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
  }).trim();
  assertSafeSource(sanitized);
  if (!sanitized) invalidTemplate("The template HTML cannot be empty.");
  return sanitized;
}

export function generateNotificationPlainText(html: string): string {
  const htmlWithLinks = html.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, label: string) => `${label} (${href})`,
  );
  return sanitizeHtml(htmlWithLinks, {
    allowedAttributes: {},
    allowedTags: [],
  })
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function validateNotificationTemplateContent(
  content: {
    htmlTemplate: string;
    plainTextTemplate: string;
    subjectTemplate: string;
  },
  allowedFields: readonly string[],
): string[] {
  if (!content.subjectTemplate.trim()) {
    invalidTemplate("The subject template is required.");
  }
  if (/[\r\n]/.test(content.subjectTemplate)) {
    invalidTemplate("The subject template cannot contain newlines.");
  }
  assertSafeSource(content.htmlTemplate);
  return validateNotificationPlaceholders(content, allowedFields);
}

export function validateNotificationHtmlImport(
  input: NotificationHtmlImportInput,
  allowedFields: readonly string[],
): ValidatedNotificationTemplateImport {
  if (!input.fileName.toLowerCase().endsWith(".html")) {
    invalidTemplate("Only .html template files are accepted.");
  }
  if (input.mediaType.toLowerCase() !== "text/html") {
    invalidTemplate("The template media type must be text/html.");
  }
  if (input.bytes.byteLength === 0)
    invalidTemplate("The template file is empty.");
  if (input.bytes.byteLength > maximumNotificationTemplateBytes) {
    invalidTemplate("The template file cannot exceed 256 KiB.");
  }

  const htmlTemplate = sanitizeNotificationHtml(decodeUtf8(input.bytes));
  const plainTextTemplate =
    input.plainTextTemplate?.trim() ||
    generateNotificationPlainText(htmlTemplate);
  const subjectTemplate = input.subjectTemplate.trim();
  const detectedPlaceholders = validateNotificationTemplateContent(
    { htmlTemplate, plainTextTemplate, subjectTemplate },
    allowedFields,
  );

  return {
    contentSha256: createHash("sha256").update(htmlTemplate).digest("hex"),
    detectedPlaceholders,
    htmlTemplate,
    mediaType: "text/html",
    plainTextTemplate,
    sourceFileName: input.fileName,
    subjectTemplate,
  };
}
