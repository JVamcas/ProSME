import type { Field } from "payload";

export function withAppFormInputs(field: Field): Field {
  if ("fields" in field) {
    return { ...field, fields: field.fields.map(withAppFormInputs) };
  }

  if (field.type === "blocks") {
    return {
      ...field,
      blocks: field.blocks.map((block) =>
        typeof block === "string"
          ? block
          : { ...block, fields: block.fields.map(withAppFormInputs) },
      ),
    };
  }

  if (
    field.type === "text" ||
    field.type === "textarea" ||
    field.type === "select"
  ) {
    const component = {
      text: "CmsFormInput",
      textarea: "CmsFormTextarea",
      select: "CmsFormSelect",
    }[field.type];
    return {
      ...field,
      admin: {
        ...field.admin,
        components: {
          ...field.admin?.components,
          Field: `./modules/content/ui/admin/CmsFormFields.tsx#${component}`,
        },
      },
    } as Field;
  }

  return field;
}
