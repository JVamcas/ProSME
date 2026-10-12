"use client";

import { useMutation } from "@tanstack/react-query";
import type { EventRegistrationInput } from "../../api/EventRegistrationSchemas";
import { clientEventRegistrationService } from "../../ClientEventRegistrationService";

export function useEventRegistration(eventId: number) {
  return useMutation({
    mutationFn: (input: EventRegistrationInput) =>
      clientEventRegistrationService.register(eventId, input),
  });
}
