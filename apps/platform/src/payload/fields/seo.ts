import type { Field } from "payload";

export const seoFields: Field[] = [
  { name: "seoTitle", type: "text", maxLength: 60 },
  { name: "seoDescription", type: "textarea", maxLength: 160 },
  { name: "excludeFromSearch", type: "checkbox", defaultValue: false },
];
