"use client";

import { useConfig, useFormFields, usePayloadAPI } from "@payloadcms/ui";

import type { HomeBannerContent } from "../../ContentTypes";
import { media } from "../../infrastructure/ContentProjection";

export function useHomeBannerPreview(): HomeBannerContent {
  const fields = useFormFields(([state]) => state);
  const { config } = useConfig();
  const imageValue: unknown = fields.heroImage?.value;
  const imageId =
    typeof imageValue === "number" || typeof imageValue === "string"
      ? imageValue
      : undefined;
  const [{ data, isError, isLoading }] = usePayloadAPI(
    imageId === undefined
      ? ""
      : `${config.routes.api}/media/${encodeURIComponent(imageId)}`,
    { initialParams: { depth: 0 } },
  );
  // The API hook retains its last response when the selected image changes.
  const selectedImage =
    !isError && !isLoading && data?.id === imageId ? media(data) : undefined;

  function text(name: string): string {
    const value: unknown = fields[name]?.value;
    return typeof value === "string" ? value : "";
  }

  return {
    eyebrow: text("eyebrow"),
    title: text("title"),
    summary: text("summary"),
    heroImage: media(imageValue) ?? selectedImage,
    heroPanelHeading: text("heroPanelHeading"),
    heroPanelSummary: text("heroPanelSummary"),
    applyLabel: text("applyLabel"),
    fundingButtonLabel: text("fundingButtonLabel"),
    benefitFunding: text("benefitFunding"),
    benefitCapacity: text("benefitCapacity"),
    benefitOpportunity: text("benefitOpportunity"),
  };
}
