import "server-only";

import {
  createContactSubmission,
  createNewsletterSubscription,
  findNewsletterSubscription,
  reactivateNewsletterSubscription,
} from "./engagement.repository";
import type {
  ContactSubmission,
  NewsletterSubscription,
} from "./engagement.schema";

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
