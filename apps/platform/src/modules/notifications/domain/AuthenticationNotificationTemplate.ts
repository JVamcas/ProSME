import {
  notificationErrorCodes,
  NotificationValidationError,
} from "./NotificationErrors";

export function assertAuthenticationTemplate(content: {
  htmlTemplate: string;
  plainTextTemplate: string;
}) {
  if (
    !/href\s*=\s*["']\s*{{\s*actionUrl\s*}}\s*["']/i.test(
      content.htmlTemplate,
    ) ||
    !/{{\s*actionUrl\s*}}/.test(content.plainTextTemplate)
  ) {
    throw new NotificationValidationError(
      notificationErrorCodes.templateInvalid,
      "Account emails must include the actionUrl link in HTML and plain text.",
    );
  }
}
