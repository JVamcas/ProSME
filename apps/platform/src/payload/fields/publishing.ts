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
export const homePublishingFields: Field[] = publishingFields.map((field): Field => {
  if (
    "name" in field &&
    (field.name === "reviewNotes" || field.name === "reviewStatus")
  ) {
    const hiddenField: Field = { ...field };
    hiddenField.admin = { ...hiddenField.admin, hidden: true };
    return hiddenField;
  }

  return field;
});
