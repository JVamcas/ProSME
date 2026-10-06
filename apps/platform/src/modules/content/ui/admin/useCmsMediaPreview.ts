"use client";

import { useConfig, usePayloadAPI } from "@payloadcms/ui";

import { media } from "../../infrastructure/ContentProjection";

export function useCmsMediaRecord(value: unknown, depth = 0): unknown {
  const { config } = useConfig();
  const imageId =
    typeof value === "number" || typeof value === "string" ? value : undefined;
  const [{ data, isError, isLoading }] = usePayloadAPI(
    imageId === undefined
      ? ""
      : `${config.routes.api}/media/${encodeURIComponent(imageId)}`,
    { initialParams: { depth } },
  );
  // Native Payload APIs retain their last response during selection changes.
  const selectedImage =
    !isError && !isLoading && data?.id === imageId ? data : undefined;

  return value && typeof value === "object" ? value : selectedImage;
}

export function useCmsMediaPreview(value: unknown) {
  return media(useCmsMediaRecord(value));
}
