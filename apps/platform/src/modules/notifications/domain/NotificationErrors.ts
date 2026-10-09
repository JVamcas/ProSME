export const notificationErrorCodes = {
  attachmentUnavailable: "NOTIFICATION_ATTACHMENT_UNAVAILABLE",
  unknownEvent: "NOTIFICATION_UNKNOWN_EVENT",
  invalidContext: "NOTIFICATION_INVALID_CONTEXT",
  invalidRecipient: "NOTIFICATION_INVALID_RECIPIENT",
  templateUnavailable: "NOTIFICATION_TEMPLATE_UNAVAILABLE",
  templateInvalid: "NOTIFICATION_TEMPLATE_INVALID",
  providerAuthenticationFailed: "NOTIFICATION_PROVIDER_AUTHENTICATION_FAILED",
  providerInvalidAddress: "NOTIFICATION_PROVIDER_INVALID_ADDRESS",
  providerRejected: "NOTIFICATION_PROVIDER_REJECTED",
  providerTimeout: "NOTIFICATION_PROVIDER_TIMEOUT",
  providerUnavailable: "NOTIFICATION_PROVIDER_UNAVAILABLE",
  retryExhausted: "NOTIFICATION_RETRY_EXHAUSTED",
} as const;

export type NotificationErrorCode =
  (typeof notificationErrorCodes)[keyof typeof notificationErrorCodes];

export type NotificationValidationIssue = {
  message: string;
  path: string;
};

export class NotificationValidationError extends Error {
  readonly code: NotificationErrorCode;
  readonly issues: readonly NotificationValidationIssue[];

  constructor(
    code: NotificationErrorCode,
    message: string,
    issues: readonly NotificationValidationIssue[] = [],
  ) {
    super(message);
    this.name = "NotificationValidationError";
    this.code = code;
    this.issues = issues;
  }
}
