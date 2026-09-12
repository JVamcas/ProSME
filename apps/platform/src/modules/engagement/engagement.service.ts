import "server-only";

import { getPayload } from "payload";
import configPromise from "@payload-config";

import type { z } from "zod";
import { contactSubmissionSchema, newsletterSubscriptionSchema } from "./engagement.schema";

export async function saveContactSubmission(data: z.infer<typeof contactSubmissionSchema>) {
  const payload = await getPayload({ config: configPromise });
  await payload.create({
    collection: "contact-submissions",
    data: { consent: data.consent, email: data.email, message: data.message, name: data.name, phone: data.phone, subject: data.subject, status: "new" },
    overrideAccess: true,
  });
}

export async function saveNewsletterSubscription(data: z.infer<typeof newsletterSubscriptionSchema>) {
  const payload = await getPayload({ config: configPromise });
  const existing = await payload.find({ collection: "newsletter-subscriptions", limit: 1, overrideAccess: true, where: { email: { equals: data.email } } });
  if (existing.docs[0]) {
    await payload.update({ collection: "newsletter-subscriptions", id: existing.docs[0].id, data: { consent: true, status: "subscribed" }, overrideAccess: true });
    return;
  }
  await payload.create({ collection: "newsletter-subscriptions", data: { consent: true, email: data.email, source: "website", status: "subscribed" }, overrideAccess: true });
}
