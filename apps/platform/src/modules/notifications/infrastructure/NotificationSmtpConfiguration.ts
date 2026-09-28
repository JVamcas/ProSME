import "server-only";

import { z } from "zod";

const gmailSmtpConfigurationSchema = z.object({
  SMTP_APP_PASSWORD: z.string().min(1, "SMTP_APP_PASSWORD is required"),
  SMTP_FROM_EMAIL: z.email("SMTP_FROM_EMAIL must be a valid email address"),
  SMTP_FROM_NAME: z
    .string()
    .trim()
    .min(1, "SMTP_FROM_NAME is required")
    .max(200)
    .refine((value) => !/[\r\n]/.test(value), "SMTP_FROM_NAME is invalid"),
  SMTP_HOST: z.literal("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().refine((value) => value === 465, {
    message: "SMTP_PORT must be 465 for secure Gmail SMTP",
  }),
  SMTP_SECURE: z.literal("true").transform(() => true as const),
  SMTP_USER: z.email("SMTP_USER must be a valid email address"),
}).superRefine((configuration, context) => {
  if (
    configuration.SMTP_FROM_EMAIL.trim().toLowerCase()
    !== configuration.SMTP_USER.trim().toLowerCase()
  ) {
    context.addIssue({
      code: "custom",
      message: "SMTP_FROM_EMAIL must match SMTP_USER",
      path: ["SMTP_FROM_EMAIL"],
    });
  }
});

export type GmailSmtpConfiguration = z.infer<
  typeof gmailSmtpConfigurationSchema
>;

export function parseGmailSmtpConfiguration(
  environment: Record<string, string | undefined>,
): GmailSmtpConfiguration {
  const parsed = gmailSmtpConfigurationSchema.safeParse(environment);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid SMTP configuration: ${details}`);
  }
  return parsed.data;
}

export function getGmailSmtpConfiguration(): GmailSmtpConfiguration {
  return parseGmailSmtpConfiguration(process.env);
}
