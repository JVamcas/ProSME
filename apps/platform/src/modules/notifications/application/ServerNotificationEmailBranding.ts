import "server-only";

import sharp from "sharp";

import { readBrandingLogo } from "@/modules/branding/application/ServerBrandingService";
import type { NotificationEmailMessage } from "./NotificationEmailSender";

export const notificationBrandingLogoContentId = "sme-fund-branding-logo";
export const notificationBrandingLogoUrl =
  `cid:${notificationBrandingLogoContentId}`;

export async function loadNotificationBrandingLogoAttachment(): Promise<
  NonNullable<NotificationEmailMessage["attachments"]>[number]
> {
  const logo = await readBrandingLogo();
  const useOriginal = ["image/jpeg", "image/png"].includes(logo.contentType);
  const contentType = useOriginal ? logo.contentType : "image/png";
  const content = useOriginal
    ? logo.body
    : await sharp(logo.body).png().toBuffer();
  return {
    cid: notificationBrandingLogoContentId,
    content,
    contentType,
    filename: contentType === "image/jpeg"
      ? "sme-fund-logo.jpg"
      : "sme-fund-logo.png",
  };
}
