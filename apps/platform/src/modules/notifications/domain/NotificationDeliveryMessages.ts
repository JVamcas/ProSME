import { notificationErrorCodes, type NotificationErrorCode } from "./NotificationErrors";

const failureMessages = {
  [notificationErrorCodes.unknownEvent]: "This type of notification is not supported.",
  [notificationErrorCodes.invalidContext]: "Some information needed for this email is missing or invalid.",
  [notificationErrorCodes.invalidRecipient]: "The recipient is no longer available. Check the notification recipients.",
  [notificationErrorCodes.templateUnavailable]: "No published email template is available. Publish a template for this notification, then retry.",
  [notificationErrorCodes.templateInvalid]: "The email template needs correction before this message can be sent.",
  [notificationErrorCodes.providerAuthenticationFailed]: "The email service could not sign in. Check the sender account settings, then retry.",
  [notificationErrorCodes.providerInvalidAddress]: "The email service could not accept the address. Check the recipient address, then retry.",
  [notificationErrorCodes.providerRejected]: "The email service declined this message. Check the sender settings and email content before retrying.",
  [notificationErrorCodes.providerTimeout]: "The email service took too long to respond. Delivery will be retried automatically.",
  [notificationErrorCodes.providerUnavailable]: "The email service is temporarily unavailable. Delivery will be retried automatically.",
  [notificationErrorCodes.retryExhausted]: "We could not send this email after several attempts. Check the delivery issue, then retry.",
} satisfies Record<NotificationErrorCode, string>;

export function notificationDeliveryFailureMessage(code: string): string {
  if (Object.hasOwn(failureMessages, code)) {
    return failureMessages[code as NotificationErrorCode];
  }
  return "This email could not be sent. Review the notification settings before retrying.";
}

export const notificationDeliveryStatusLabels = {
  PENDING: "Waiting to send",
  PROCESSING: "Sending",
  SENT: "Sent",
  FAILED: "Could not send",
  DEAD_LETTER: "Needs attention",
} as const;

export function notificationDeliveryStatusLabel(status: string): string {
  if (Object.hasOwn(notificationDeliveryStatusLabels, status)) {
    return notificationDeliveryStatusLabels[
      status as keyof typeof notificationDeliveryStatusLabels
    ];
  }
  return "Unknown status";
}
