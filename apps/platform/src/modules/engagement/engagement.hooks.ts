"use client";

import { useMutation } from "@tanstack/react-query";

import { engagementClientService } from "./engagement-client.service";

export function useContactSubmission() {
  return useMutation({
    mutationFn: engagementClientService.submitContact,
  });
}

export function useNewsletterSubscription() {
  return useMutation({
    mutationFn: engagementClientService.subscribeToNewsletter,
  });
}
