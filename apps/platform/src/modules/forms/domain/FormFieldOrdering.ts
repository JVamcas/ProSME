import type { FormField } from "@/modules/forms/FormTypes";

export function formFieldIdentity(field: FormField) {
  return `field:${field.id ?? field.key}`;
}

function normaliseFieldOrder(fields: FormField[]) {
  const nextOrder = new Map<string, number>();
  return fields.map((field) => {
    const order = (nextOrder.get(field.sectionId) ?? 0) + 1;
    nextOrder.set(field.sectionId, order);
    return { ...field, order };
  });
}

export function moveFormField(
  fields: FormField[],
  activeId: string,
  targetSectionId: string,
  overId?: string,
) {
  const activeIndex = fields.findIndex(
    (field) => formFieldIdentity(field) === activeId,
  );
  if (activeIndex < 0) return fields;
  const overIndex = overId
    ? fields.findIndex((field) => formFieldIdentity(field) === overId)
    : -1;
  const movingWithinSection = overIndex >= 0
    && fields[overIndex].sectionId === fields[activeIndex].sectionId;

  const nextFields = [...fields];
  const [activeField] = nextFields.splice(activeIndex, 1);
  const movedField = { ...activeField, sectionId: targetSectionId };
  const nextOverIndex = overId
    ? nextFields.findIndex((field) => formFieldIdentity(field) === overId)
    : -1;

  if (movingWithinSection) {
    nextFields.splice(overIndex, 0, movedField);
  } else if (nextOverIndex >= 0) {
    nextFields.splice(nextOverIndex, 0, movedField);
  } else {
    const lastTargetIndex = nextFields.findLastIndex(
      (field) => field.sectionId === targetSectionId,
    );
    nextFields.splice(lastTargetIndex + 1, 0, movedField);
  }

  return normaliseFieldOrder(nextFields);
}

export function removeFormSectionFields(
  fields: FormField[],
  sectionId: string,
) {
  return normaliseFieldOrder(
    fields.filter((field) => field.sectionId !== sectionId),
  );
}

export function removeFormField(fields: FormField[], fieldId: string) {
  return normaliseFieldOrder(
    fields.filter((field) => formFieldIdentity(field) !== fieldId),
  );
}
