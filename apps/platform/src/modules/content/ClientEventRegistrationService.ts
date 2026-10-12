"use client";

import { postData } from "@/lib/client-http";
import type { EventRegistrationInput } from "./api/EventRegistrationSchemas";
import type { EventRegistrationReceipt } from "./domain/EventRegistration";

function register(eventId: number, input: EventRegistrationInput) {
  return postData<EventRegistrationReceipt, EventRegistrationInput>(
    `/api/public/events/${eventId}/registrations`,
    input,
  );
}

export const clientEventRegistrationService = { register };
