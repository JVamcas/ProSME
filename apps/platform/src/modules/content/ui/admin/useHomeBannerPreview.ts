"use client";

import { useFormFields } from "@payloadcms/ui";

import type { HomeBannerContent } from "../../ContentTypes";
import { useCmsMediaPreview } from "./useCmsMediaPreview";

export function useHomeBannerPreview(): HomeBannerContent {
  const fields = useFormFields(([state]) => state);
  const heroImage = useCmsMediaPreview(fields.heroImage?.value);

  function text(name: string): string {
    const value: unknown = fields[name]?.value;
    return typeof value === "string" ? value : "";
  }

  return {
    eyebrow: text("eyebrow"),
    title: text("title"),
    summary: text("summary"),
    heroImage,
    heroPanelHeading: text("heroPanelHeading"),
    heroPanelSummary: text("heroPanelSummary"),
    applyLabel: text("applyLabel"),
    fundingButtonLabel: text("fundingButtonLabel"),
    benefitFunding: text("benefitFunding"),
    benefitCapacity: text("benefitCapacity"),
    benefitOpportunity: text("benefitOpportunity"),
  };
}
