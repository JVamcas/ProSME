"use client";

import { useConfig, usePayloadAPI } from "@payloadcms/ui";

import { media } from "../../infrastructure/ContentProjection";

export function useCmsMediaPreview(value: unknown) {
  const { config } = useConfig();
  const imageId =
    typeof value === "number" || typeof value === "string" ? value : undefined;
  const [{ data, isError, isLoading }] = usePayloadAPI(
    imageId === undefined
      ? ""
      : `${config.routes.api}/media/${encodeURIComponent(imageId)}`,
    { initialParams: { depth: 0 } },
  );
  // Native Payload APIs retain their last response during selection changes.
  const selectedImage =
    !isError && !isLoading && data?.id === imageId ? media(data) : undefined;

  return media(value) ?? selectedImage;
}
