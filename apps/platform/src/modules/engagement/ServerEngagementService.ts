import "server-only";

import {
  createContactSubmission,
  createNewsletterSubscription,
  findNewsletterSubscription,
  reactivateNewsletterSubscription,
} from "./EngagementRepository";
import type {
  ContactSubmission,
  NewsletterSubscription,
} from "./EngagementSchemas";

export async function saveContactSubmission(data: ContactSubmission) {
  await createContactSubmission(data);
}

export async function saveNewsletterSubscription(
  data: NewsletterSubscription,
) {
  const existing = await findNewsletterSubscription(data.email);
  if (existing) {
    await reactivateNewsletterSubscription(existing.id);
    return;
  }

  await createNewsletterSubscription(data.email);
}
