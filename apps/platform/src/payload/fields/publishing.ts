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

// Keep stored notes and version history while removing this control from Home.
export const homePublishingFields: Field[] = publishingFields.map((field) => {
  if (field.type === "textarea" && field.name === "reviewNotes") {
    return { ...field, admin: { ...field.admin, hidden: true } };
  }

  if (field.type === "select" && field.name === "reviewStatus") {
    return {
      ...field,
      admin: {
        ...field.admin,
        components: {
          ...field.admin?.components,
          Field: "./modules/content/ui/admin/CmsFormFields.tsx#CmsFormSelect",
        },
      },
    };
  }

  return field;
});
