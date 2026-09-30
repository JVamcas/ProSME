import "server-only";

import nodemailer from "nodemailer";

import {
  NotificationEmailSendError,
  type NotificationEmailMessage,
  type NotificationEmailSender,
} from "../application/NotificationEmailSender";
import { notificationErrorCodes } from "../domain/NotificationErrors";
import type { GmailSmtpConfiguration } from "./NotificationSmtpConfiguration";

type SmtpFailure = {
  code?: string;
  command?: string;
  responseCode?: number;
};

type EmailTransport = {
  sendMail(options: {
    attachments?: NotificationEmailMessage["attachments"];
    from: { address: string; name: string };
    html: string;
    subject: string;
    text: string;
    to: string;
  }): Promise<{ messageId?: string }>;
};

function smtpFailure(error: unknown): SmtpFailure {
  if (!error || typeof error !== "object") return {};
  const value = error as Record<string, unknown>;
  return {
    code: typeof value.code === "string" ? value.code : undefined,
    command: typeof value.command === "string" ? value.command : undefined,
    responseCode: typeof value.responseCode === "number"
      ? value.responseCode
      : undefined,
  };
}

export function classifySmtpFailure(error: unknown): NotificationEmailSendError {
  const failure = smtpFailure(error);
  if (
    failure.code === "EAUTH"
    || failure.responseCode === 534
    || failure.responseCode === 535
  ) {
    return new NotificationEmailSendError(
      notificationErrorCodes.providerAuthenticationFailed,
      false,
    );
  }
  if (
    failure.code === "EENVELOPE"
    || failure.command === "RCPT TO"
    || [550, 551, 553].includes(failure.responseCode ?? 0)
  ) {
    return new NotificationEmailSendError(
      notificationErrorCodes.providerInvalidAddress,
      false,
    );
  }
  if (failure.code === "ETIMEDOUT") {
    return new NotificationEmailSendError(
      notificationErrorCodes.providerTimeout,
      true,
    );
  }
  if (
    failure.responseCode !== undefined
    && failure.responseCode >= 500
  ) {
    return new NotificationEmailSendError(
      notificationErrorCodes.providerRejected,
      false,
    );
  }
  return new NotificationEmailSendError(
    notificationErrorCodes.providerUnavailable,
    true,
  );
}

export function createGmailSmtpEmailSender(
  configuration: GmailSmtpConfiguration,
  providedTransport?: EmailTransport,
): NotificationEmailSender {
  const transport = providedTransport ?? nodemailer.createTransport({
    auth: {
      pass: configuration.SMTP_APP_PASSWORD,
      user: configuration.SMTP_USER,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    host: configuration.SMTP_HOST,
    port: configuration.SMTP_PORT,
    secure: configuration.SMTP_SECURE,
    socketTimeout: 30_000,
  });

  return {
    async send(message: NotificationEmailMessage) {
      try {
        const result = await transport.sendMail({
          attachments: message.attachments,
          from: {
            address: configuration.SMTP_FROM_EMAIL,
            name: configuration.SMTP_FROM_NAME,
          },
          html: message.html,
          subject: message.subject,
          text: message.plainText,
          to: message.to,
        });
        if (!result.messageId) {
          throw new NotificationEmailSendError(
            notificationErrorCodes.providerRejected,
            false,
          );
        }
        return { providerMessageId: result.messageId };
      } catch (error) {
        if (error instanceof NotificationEmailSendError) throw error;
        throw classifySmtpFailure(error);
      }
    },
  };
}
