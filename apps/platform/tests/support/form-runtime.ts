import type { FormField, FormRuntimeSchema } from "@/modules/forms/FormTypes";

const sectionId = "10000000-0000-4000-8000-000000000001";

function field(
  key: string,
  type: FormField["type"],
  order: number,
): FormField {
  const result: FormField = {
    columnSpan: 1,
    helpText: `${key} help`,
    key,
    label: `${key} label`,
    options: type === "SELECT"
      ? [
          { key: "SECOND", label: "Second option", order: 2 },
          { key: "FIRST", label: "First option", order: 1 },
        ]
      : [],
    order,
    required: order === 1,
    sectionId,
    type,
  };
  if (key === "NAME") {
    result.minLength = 2;
    result.maxLength = 50;
  }
  if (key === "AMOUNT") {
    result.minimum = 100;
    result.maximum = 1_000;
  }
  return result;
}

export function runtimeDefinition(): FormRuntimeSchema {
  return {
    fields: [
      field("NOTES", "TEXTAREA", 2),
      field("NAME", "TEXT", 1),
      field("AMOUNT", "NUMBER", 3),
      field("START_DATE", "DATE", 4),
      field("APPROVED", "YES_NO", 5),
      field("REGION", "SELECT", 6),
    ],
    instructions: "Complete the form.",
    sections: [{
      columnSpan: 3,
      description: "Basic information.",
      id: sectionId,
      key: "BASIC_INFORMATION",
      order: 1,
      showContainer: true,
      title: "Basic information",
    }],
    submitLabel: "Submit form",
    versionId: "20000000-0000-4000-8000-000000000001",
    versionNumber: 2,
  };
}
