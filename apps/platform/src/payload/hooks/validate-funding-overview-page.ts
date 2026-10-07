import { ValidationError, type CollectionBeforeValidateHook } from "payload";

import { fundingOverviewSection } from "@/modules/content/FundingOverviewSections";

export const validateFundingOverviewPage: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
}) => {
  if (!data) return data;
  const slug = data.slug ?? originalDoc?.slug;
  const section = fundingOverviewSection(slug);
  if (
    originalDoc?.slug && slug !== originalDoc.slug &&
    (section || fundingOverviewSection(originalDoc.slug))
  ) {
    throw new ValidationError({
      errors: [{ path: "slug", message: "Overview section identifiers cannot be changed." }],
    });
  }
  if (!section) return data;
  const layout = data.layout ?? originalDoc?.layout;
  if (
    !Array.isArray(layout) || layout.length !== 1 ||
    layout[0]?.blockType !== section.blockType
  ) {
    throw new ValidationError({
      errors: [{
        path: "layout",
        message: `${section.title} must contain only its own section.`,
      }],
    });
  }
  return data;
};
