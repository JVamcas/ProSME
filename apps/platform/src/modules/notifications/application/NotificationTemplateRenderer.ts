import {
  notificationErrorCodes,
  NotificationValidationError,
} from "../domain/NotificationErrors";

const placeholderPattern = /{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g;

export type NotificationTemplateContent = {
  htmlTemplate: string;
  plainTextTemplate: string;
  subjectTemplate: string;
};

export type RenderedNotificationTemplate = {
  html: string;
  plainText: string;
  subject: string;
};

export function discoverNotificationPlaceholders(template: string): string[] {
  return [...new Set(
    [...template.matchAll(placeholderPattern)].map((match) => match[1]),
  )].sort();
}

export function validateNotificationPlaceholders(
  content: NotificationTemplateContent,
  allowedFields: readonly string[],
): string[] {
  const combined = [
    content.subjectTemplate,
    content.htmlTemplate,
    content.plainTextTemplate,
  ].join("\n");
  const placeholders = discoverNotificationPlaceholders(combined);
  const unknown = placeholders.filter((field) => !allowedFields.includes(field));
  const withoutValidPlaceholders = combined.replace(placeholderPattern, "");

  if (unknown.length || /{{|}}/.test(withoutValidPlaceholders)) {
    throw new NotificationValidationError(
      notificationErrorCodes.templateInvalid,
      unknown.length
        ? `Unsupported template fields: ${unknown.join(", ")}.`
        : "Template placeholders must use the {{fieldName}} syntax.",
      unknown.map((field) => ({
        message: `${field} is not available for this template target.`,
        path: "template",
      })),
    );
  }
  return placeholders;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function replacePlaceholders(
  template: string,
  values: Readonly<Record<string, string>>,
  escape: boolean,
): string {
  return template.replace(placeholderPattern, (_, field: string) => {
    const value = values[field];
    if (value === undefined || value === null || value === "") {
      throw new NotificationValidationError(
        notificationErrorCodes.invalidContext,
        `Missing required notification value: ${field}.`,
        [{ message: "A required render value is missing.", path: field }],
      );
    }
    return escape ? escapeHtml(value) : value;
  });
}

export function renderNotificationTemplate(
  content: NotificationTemplateContent,
  allowedFields: readonly string[],
  values: Readonly<Record<string, string>>,
): RenderedNotificationTemplate {
  const placeholders = validateNotificationPlaceholders(content, allowedFields);
  for (const field of placeholders) {
    if (!(field in values)) {
      throw new NotificationValidationError(
        notificationErrorCodes.invalidContext,
        `Missing required notification value: ${field}.`,
        [{ message: "A required render value is missing.", path: field }],
      );
    }
  }

  const subject = replacePlaceholders(content.subjectTemplate, values, false);
  if (/[\r\n]/.test(subject)) {
    throw new NotificationValidationError(
      notificationErrorCodes.templateInvalid,
      "Notification subjects cannot contain newlines.",
    );
  }
  return {
    html: replacePlaceholders(content.htmlTemplate, values, true),
    plainText: replacePlaceholders(content.plainTextTemplate, values, false),
    subject,
  };
}
