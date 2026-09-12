import type { Block } from "payload";

export const heroBlock: Block = {
  slug: "hero",
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "heading", type: "text", required: true },
    { name: "summary", type: "textarea" },
    { name: "image", type: "upload", relationTo: "media" },
  ],
};

export const richTextBlock: Block = {
  slug: "richText",
  fields: [{ name: "content", type: "richText", required: true }],
};

export const callToActionBlock: Block = {
  slug: "callToAction",
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "summary", type: "textarea" },
    { name: "label", type: "text", required: true },
    { name: "href", type: "text", required: true },
  ],
};

export const statisticsBlock: Block = {
  slug: "statistics",
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "summary", type: "textarea" },
    { name: "backgroundImage", type: "upload", relationTo: "media" },
    { name: "items", type: "array", fields: [{ name: "value", type: "text", required: true }, { name: "label", type: "text", required: true }], admin: { description: "Leave empty to use the published programme statistics." } },
  ],
};

export const resourceGridBlock: Block = {
  slug: "resourceGrid",
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "limit", type: "number", defaultValue: 4, min: 1, max: 12 },
  ],
};

export const faqListBlock: Block = {
  slug: "faqList",
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "category", type: "text", admin: { description: "Leave empty to show all published FAQs." } },
  ],
};

const fundingIconOptions = [
  { label: "Grant funding", value: "grant" },
  { label: "Mentorship", value: "mentorship" },
  { label: "Market access", value: "market" },
  { label: "Innovation", value: "innovation" },
  { label: "Inclusive ownership", value: "inclusive" },
  { label: "Ready to grow", value: "growth" },
  { label: "Economic impact", value: "impact" },
];

const fundingCardFields = [
  { name: "icon", type: "select" as const, required: true, options: fundingIconOptions },
  { name: "title", type: "text" as const, required: true },
  { name: "description", type: "textarea" as const, required: true },
];

export const fundingSupportBlock: Block = {
  slug: "fundingSupport",
  labels: { singular: "Funding support section", plural: "Funding support sections" },
  fields: [
    { name: "eyebrow", type: "text", required: true },
    { name: "heading", type: "text", required: true },
    { name: "description", type: "textarea", required: true },
    { name: "uses", type: "array", minRows: 1, fields: [{ name: "label", type: "text", required: true }] },
    { name: "cards", type: "array", minRows: 1, fields: fundingCardFields },
  ],
};

export const fundingPrioritiesBlock: Block = {
  slug: "fundingPriorities",
  labels: { singular: "Funding priorities section", plural: "Funding priorities sections" },
  fields: [
    { name: "eyebrow", type: "text", required: true },
    { name: "heading", type: "text", required: true },
    { name: "items", type: "array", minRows: 1, fields: fundingCardFields },
  ],
};

export const eligibilityFocusSectorsBlock: Block = {
  slug: "eligibilityFocusSectors",
  labels: { singular: "Eligibility focus sectors", plural: "Eligibility focus sectors" },
  fields: [
    { name: "eyebrow", type: "text", required: true },
    { name: "heading", type: "text", required: true },
    { name: "noticeHeading", type: "text", required: true },
    { name: "notice", type: "textarea", required: true },
  ],
};

export const publicContentBlocks = [heroBlock, richTextBlock, callToActionBlock, statisticsBlock, resourceGridBlock, faqListBlock];
export const pageContentBlocks = [...publicContentBlocks, fundingSupportBlock, fundingPrioritiesBlock, eligibilityFocusSectorsBlock];
