"use client";

import { useFormFields } from "@payloadcms/ui";
import { reduceFieldsToValues } from "payload/shared";
import { homeProcessContent, homeSupportContent } from "../../HomeListContent";

export function useHomeListPreview() {
  const fields = useFormFields(([state]) => state);
  const data = reduceFieldsToValues(fields, true);
  return {
    process: homeProcessContent(data.process),
    ...homeSupportContent(data),
  };
}
