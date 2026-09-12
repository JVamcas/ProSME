"use client";

import { postJson } from "@/lib/client-http";
import type {
  ContactSubmission,
  NewsletterSubscription,
} from "./engagement.schema";

export type EngagementResponse = {
  message: string;
};

export type ContactSubmissionRequest = ContactSubmission;
export type NewsletterSubscriptionRequest = NewsletterSubscription;

async function submitContact(data: ContactSubmissionRequest) {
  return postJson<EngagementResponse, ContactSubmissionRequest>(
    "/api/contact",
    data,
  );
}

async function subscribeToNewsletter(data: NewsletterSubscriptionRequest) {
  return postJson<EngagementResponse, NewsletterSubscriptionRequest>(
    "/api/newsletter",
    data,
  );
}

export const engagementClientService = {
  submitContact,
  subscribeToNewsletter,
};
