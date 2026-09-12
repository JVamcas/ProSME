import type { Field } from "payload";

export const publishingFields: Field[] = [
  {
    name: "reviewStatus",
    type: "select",
    defaultValue: "draft",
    index: true,
    options: [
      { label: "Draft", value: "draft" },
      { label: "Ready for review", value: "inReview" },
      { label: "Approved", value: "approved" },
    ],
    required: true,
  },
  {
    name: "reviewNotes",
    type: "textarea",
    admin: { description: "Internal notes for editors and reviewers." },
  },
];
