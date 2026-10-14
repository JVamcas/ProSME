import type { FormField, FormSection } from "../FormTypes";

export function draftFieldRow(versionId: string, field: FormField) {
  return {
    columnSpan: field.columnSpan,
    formVersionId: versionId,
    helpText: field.helpText ?? null,
    maximum: field.maximum ?? null,
    acceptedExtensions: field.acceptedExtensions ?? null,
    maxPages: field.maxPages ?? null,
    maximumFileSizeMb: field.maximumFileSizeMb ?? null,
    uploadedBy: field.uploadedBy ?? null,
    maxLength: field.maxLength ?? null,
    minimum: field.minimum ?? null,
    minLength: field.minLength ?? null,
    repeatableConfiguration: field.repeatable ?? null,
    id: field.id ?? crypto.randomUUID(),
    key: field.key,
    label: field.label,
    order: field.order,
    required: field.required,
    sectionId: field.sectionId,
    type: field.type,
    visibilityCondition: field.visibilityCondition ?? null,
    rules: field.rules ?? null,
    scoringAggregate: field.scoringAggregate ?? null,
    workflowDocument: field.workflowDocument ?? null,
  };
}

export function draftSectionRow(versionId: string, section: FormSection) {
  return {
    columnSpan: section.columnSpan,
    description: section.description ?? "",
    formVersionId: versionId,
    id: section.id ?? crypto.randomUUID(),
    key: section.key,
    order: section.order,
    showContainer: section.showContainer ?? true,
    title: section.title,
    visibilityCondition: section.visibilityCondition ?? null,
  };
}
