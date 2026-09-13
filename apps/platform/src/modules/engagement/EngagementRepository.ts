import "server-only";

import configPromise from "@payload-config";
import { getPayload } from "payload";

import type { ContactSubmission } from "./EngagementSchemas";

export async function createContactSubmission(data: ContactSubmission) {
  const payload = await getPayload({ config: configPromise });
  await payload.create({
    collection: "contact-submissions",
    data: {
      consent: data.consent,
      email: data.email,
      message: data.message,
      name: data.name,
      phone: data.phone,
      subject: data.subject,
      status: "new",
    },
    overrideAccess: true,
  });
}

export async function findNewsletterSubscription(email: string) {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "newsletter-subscriptions",
    limit: 1,
    overrideAccess: true,
    where: {
      email: {
        equals: email,
      },
    },
  });

  return result.docs[0] ?? null;
}

export async function createNewsletterSubscription(email: string) {
  const payload = await getPayload({ config: configPromise });
  await payload.create({
    collection: "newsletter-subscriptions",
    data: {
      consent: true,
      email,
      source: "website",
      status: "subscribed",
    },
    overrideAccess: true,
  });
}

export async function reactivateNewsletterSubscription(id: number) {
  const payload = await getPayload({ config: configPromise });
  await payload.update({
    collection: "newsletter-subscriptions",
    id,
    data: {
      consent: true,
      status: "subscribed",
    },
    overrideAccess: true,
  });
}
