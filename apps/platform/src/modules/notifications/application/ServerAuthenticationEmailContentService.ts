import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  AuthEmailRequestError,
  generateAuthenticationActionUrl,
} from "@/platform/auth/firebase/ServerAuthEmailService";
import { assertAuthenticationTemplate } from "../domain/AuthenticationNotificationTemplate";
import type { AuthenticationEventKey } from "../domain/NotificationEvent";
import { notificationEventTemplateFields } from "../domain/NotificationTemplateFields";
import {
  notificationErrorCodes,
  NotificationValidationError,
} from "../domain/NotificationErrors";
import type { ClaimedNotificationDelivery } from "../infrastructure/NotificationDispatchRepository";
import { renderNotificationTemplate } from "./NotificationTemplateRenderer";

const sourceTemplates: Record<
  AuthenticationEventKey,
  { file: string; subject: string }
> = {
  "auth.email.verification": {
    file: "auth-email-verification.html",
    subject: "Verify your email for {{platformName}}",
  },
  "auth.password.reset": {
    file: "auth-password-reset.html",
    subject: "Reset your password for {{platformName}}",
  },
};

const templateCache = new Map<string, Promise<string>>();

function loadSourceTemplate(file: string) {
  let template = templateCache.get(file);
  if (!template) {
    template = readFile(
      path.join(
        process.cwd(),
        "src/modules/notifications/templates/email",
        file,
      ),
      "utf8",
    );
    templateCache.set(file, template);
    template.catch(() => templateCache.delete(file));
  }
  return template;
}

export async function renderAuthenticationEmail(
  delivery: ClaimedNotificationDelivery,
  context: { firebaseUid: string; recipientEmail: string },
) {
  const eventKey = delivery.eventKey as AuthenticationEventKey;
  if (
    context.recipientEmail.toLowerCase() !==
    delivery.recipientEmail.toLowerCase()
  ) {
    throw new NotificationValidationError(
      notificationErrorCodes.invalidRecipient,
      "Account recipient mismatch.",
    );
  }
  const source = sourceTemplates[eventKey];
  const htmlTemplate =
    delivery.htmlTemplate || (await loadSourceTemplate(source.file));
  const content = {
    htmlTemplate,
    plainTextTemplate:
      delivery.plainTextTemplate ||
      "Hello {{recipientName}},\nComplete your account action for {{platformName}}: {{actionUrl}}\nIf you did not request this email, you can ignore it.",
    subjectTemplate: delivery.subjectTemplate || source.subject,
  };
  assertAuthenticationTemplate(content);
  let actionUrl;
  try {
    actionUrl = await generateAuthenticationActionUrl({ eventKey, ...context });
  } catch (error) {
    if (
      error instanceof AuthEmailRequestError ||
      (typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "auth/user-not-found")
    ) {
      throw new NotificationValidationError(
        notificationErrorCodes.invalidRecipient,
        "Account action is no longer available.",
      );
    }
    throw error;
  }
  return renderNotificationTemplate(
    content,
    notificationEventTemplateFields[eventKey],
    {
      actionUrl,
      platformName: "SME Fund Namibia",
      recipientName: delivery.recipientName,
    },
  );
}
