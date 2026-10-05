"use client";

import { useConfig, useFormFields, usePayloadAPI } from "@payloadcms/ui";
import { reduceFieldsToValues } from "payload/shared";

import { homeImpactContent } from "../../HomeImpactContent";
import { useCmsMediaPreview } from "./useCmsMediaPreview";

export function useHomeImpactPreview() {
  const fields = useFormFields(([state]) => state);
  const values = reduceFieldsToValues(fields, true);
  const blocks: Record<string, unknown>[] = Array.isArray(values.layout)
    ? values.layout
    : [];
  const block = blocks.find((item) => item.blockType === "statistics");
  const content = homeImpactContent(block);
  const backgroundImage = useCmsMediaPreview(block?.backgroundImage);
  const { config } = useConfig();
  const [{ data }] = usePayloadAPI(
    content.items.length ? "" : `${config.routes.api}/programme-statistics`,
    {
      initialParams: {
        depth: 0,
        limit: 10,
        sort: "order",
        where: { _status: { equals: "published" } },
      },
    },
  );

  return {
    ...content,
    backgroundImage,
    items: content.items.length
      ? content.items
      : homeImpactContent({ items: data?.docs }).items,
  };
}
