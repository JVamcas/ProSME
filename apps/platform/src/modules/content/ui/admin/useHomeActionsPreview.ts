"use client";

import { useFormFields } from "@payloadcms/ui";

import { defaultHomeActionCards } from "../../ContentDefaults";
import type { HomepageContent } from "../../ContentTypes";

export function useHomeActionsPreview(): Pick<HomepageContent, "actionCards"> {
  const fields = useFormFields(([state]) => state);

  function text(name: keyof HomepageContent["actionCards"]): string {
    const value: unknown = fields[`actionCards.${name}`]?.value;
    return typeof value === "string" ? value : defaultHomeActionCards[name];
  }

  return {
    actionCards: {
      fundingTitle: text("fundingTitle"),
      fundingDescription: text("fundingDescription"),
      eligibilityTitle: text("eligibilityTitle"),
      eligibilityDescription: text("eligibilityDescription"),
      trackingTitle: text("trackingTitle"),
      trackingDescription: text("trackingDescription"),
    },
  };
}
