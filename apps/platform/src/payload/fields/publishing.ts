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

// Home uses Save draft and Publish; retain legacy review data without controls.
export const homePublishingFields: Field[] = publishingFields.map((field) => {
  if (
    "name" in field &&
    (field.name === "reviewNotes" || field.name === "reviewStatus")
  ) {
    return { ...field, admin: { ...field.admin, hidden: true } };
  }

  return field;
});
