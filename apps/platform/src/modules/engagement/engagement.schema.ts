import { z } from "zod";

const consent = z.literal(true, { error: "Consent is required" });
const honeypot = z.string().max(0).optional();

export const contactSubmissionSchema = z.object({
  company: honeypot,
  consent,
  email: z.email().max(254),
  message: z.string().trim().min(10).max(3000),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(3).max(150),
});

export const newsletterSubscriptionSchema = z.object({
  company: honeypot,
  consent,
  email: z.email().max(254),
});
