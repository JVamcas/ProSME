import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  classifySmtpFailure,
  createGmailSmtpEmailSender,
} from "@/modules/notifications/infrastructure/GmailSmtpEmailSender";
import { parseGmailSmtpConfiguration } from "@/modules/notifications/infrastructure/NotificationSmtpConfiguration";

const environment = {
  SMTP_APP_PASSWORD: "gmail-application-password",
  SMTP_FROM_EMAIL: "sender@example.com",
  SMTP_FROM_NAME: "SME Fund",
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PORT: "465",
  SMTP_SECURE: "true",
  SMTP_USER: "sender@example.com",
};

describe("Gmail SMTP notification sender", () => {
  it("validates secure Gmail configuration and matching sender identity", () => {
    expect(parseGmailSmtpConfiguration(environment)).toMatchObject({
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PORT: 465,
      SMTP_SECURE: true,
    });
    expect(() => parseGmailSmtpConfiguration({
      ...environment,
      SMTP_FROM_EMAIL: "alias@example.com",
    })).toThrow("SMTP_FROM_EMAIL must match SMTP_USER");
    expect(() => parseGmailSmtpConfiguration({
      ...environment,
      SMTP_SECURE: "false",
    })).toThrow("SMTP_SECURE");
  });

  it("sends HTML and plain text through an injected transport and captures message ID", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "gmail-message-1" });
    const sender = createGmailSmtpEmailSender(
      parseGmailSmtpConfiguration(environment),
      { sendMail },
    );
    await expect(sender.send({
      attachments: [{
        cid: "sme-fund-branding-logo",
        content: Buffer.from("logo"),
        contentType: "image/png",
        filename: "sme-fund-logo.png",
      }],
      html: "<p>Hello</p>",
      plainText: "Hello",
      subject: "Status",
      to: "recipient@example.com",
    })).resolves.toEqual({ providerMessageId: "gmail-message-1" });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      attachments: [expect.objectContaining({
        cid: "sme-fund-branding-logo",
      })],
      html: "<p>Hello</p>",
      text: "Hello",
      to: "recipient@example.com",
    }));
  });

  it.each([
    [{ code: "EAUTH", message: "gmail-application-password" }, "NOTIFICATION_PROVIDER_AUTHENTICATION_FAILED", false],
    [{ code: "EENVELOPE" }, "NOTIFICATION_PROVIDER_INVALID_ADDRESS", false],
    [{ code: "ETIMEDOUT" }, "NOTIFICATION_PROVIDER_TIMEOUT", true],
    [{ responseCode: 421 }, "NOTIFICATION_PROVIDER_UNAVAILABLE", true],
    [{ responseCode: 554 }, "NOTIFICATION_PROVIDER_REJECTED", false],
  ])("classifies provider failure %# without exposing its message", (failure, code, retryable) => {
    const classified = classifySmtpFailure(failure);
    expect(classified).toMatchObject({ code, retryable });
    expect(classified.message).not.toContain("gmail-application-password");
  });

  it("never includes SMTP secrets in configuration errors", () => {
    const secret = "do-not-expose-this-application-password";
    expect(() => parseGmailSmtpConfiguration({
      ...environment,
      SMTP_APP_PASSWORD: secret,
      SMTP_HOST: "smtp.example.com",
    })).toThrowError(expect.not.stringContaining(secret));
  });
});
