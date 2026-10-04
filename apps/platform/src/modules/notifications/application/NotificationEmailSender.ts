import type { NotificationErrorCode } from "../domain/NotificationErrors";

export type NotificationEmailMessage = {
  attachments?: Array<{
    cid: string;
    content: Buffer;
    contentType: string;
    filename: string;
  }>;
  html: string;
  plainText: string;
  subject: string;
  to: string;
};

export type NotificationEmailSendResult = {
  providerMessageId: string;
};

export interface NotificationEmailSender {
  send(message: NotificationEmailMessage): Promise<NotificationEmailSendResult>;
}

export class NotificationEmailSendError extends Error {
  readonly code: NotificationErrorCode;
  readonly retryable: boolean;

  constructor(code: NotificationErrorCode, retryable: boolean) {
    super("The notification provider could not deliver the message.");
    this.name = "NotificationEmailSendError";
    this.code = code;
    this.retryable = retryable;
  }
}
