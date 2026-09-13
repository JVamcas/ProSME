"use client";

import { useMutation } from "@tanstack/react-query";

import { clientEngagementService } from "./ClientEngagementService";

export function useContactSubmission() {
  return useMutation({
    mutationFn: clientEngagementService.submitContact,
  });
}

export function useNewsletterSubscription() {
  return useMutation({
    mutationFn: clientEngagementService.subscribeToNewsletter,
  });
}
