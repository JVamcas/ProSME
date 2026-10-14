"use client";

import { useState } from "react";
import { FormFieldRulesDialog } from "./FormFieldRulesDialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type {
  FormDisplayMode,
  FormField,
  FormSection,
} from "@/modules/forms/FormTypes";
import { FormFieldDialog } from "@/modules/forms/ui/builder/FormFieldDialog";
import { FormSectionBuilder } from "@/modules/forms/ui/builder/FormSectionBuilder";
import { FormSectionDialog } from "@/modules/forms/ui/builder/FormSectionDialog";
import { FormPresentationSettings } from "@/modules/forms/ui/builder/FormPresentationSettings";

export function FormEditorBody({
  canEdit,
  dialogOpen,
  field,
  fieldSectionId,
  fieldToRemove,
  fields,
  displayMode,
  isPending,
  onAddField,
  onAddSection,
  onCancelDelete,
  onCancelSectionDelete,
  onCloseDialog,
  onCloseSectionDialog,
  onConfirmDelete,
  onConfirmSectionDelete,
  onDelete,
  onDuplicate,
  onDeleteSection,
  onEdit,
  onEditSection,
  onDisplayModeChange,
  onReorderFields,
  onReorderSections,
  onSave,
  onSaveSection,
  section,
  sectionDialogOpen,
  sections,
  sectionToRemove,
}: {
  canEdit: boolean;
  dialogOpen: boolean;
  field?: FormField;
  fieldSectionId?: string;
  fieldToRemove?: FormField;
  fields: FormField[];
  displayMode: FormDisplayMode;
  isPending: boolean;
  onAddField: (sectionId: string) => void;
  onAddSection: () => void;
  onCancelDelete: () => void;
  onCancelSectionDelete: () => void;
  onCloseDialog: () => void;
  onCloseSectionDialog: () => void;
  onConfirmDelete: () => void;
  onConfirmSectionDelete: () => void;
  onDelete: (field: FormField) => void;
  onDuplicate: (field: FormField) => void;
  onDeleteSection: (section: FormSection) => void;
  onEdit: (field: FormField) => void;
  onEditSection: (section: FormSection) => void;
  onDisplayModeChange: (displayMode: FormDisplayMode) => void;
  onReorderFields: (fields: FormField[]) => void;
  onReorderSections: (sections: FormSection[]) => void;
  onSave: (field: FormField) => Promise<void>;
  onSaveSection: (section: FormSection) => Promise<void>;
  section?: FormSection;
  sectionDialogOpen: boolean;
  sections: FormSection[];
  sectionToRemove?: FormSection;
}) {
  const [ruleField, setRuleField] = useState<FormField>();
  const sectionFieldCount = fields.filter(
    (item) => item.sectionId === sectionToRemove?.id,
  ).length;
  const nextFieldOrder =
    fields.filter((item) => item.sectionId === fieldSectionId).length + 1;
  const fieldSection = sections.find((item) => item.id === fieldSectionId);
  const sectionOrders = new Map(
    sections.flatMap((item) =>
      item.id ? [[item.id, item.order] as const] : [],
    ),
  );
  const targetSectionOrder = section?.order ?? sections.length + 1;
  const sectionVisibilityFields = fields.filter(
    (item) =>
      (sectionOrders.get(item.sectionId) ?? Infinity) < targetSectionOrder,
  );
  return (
    <>
      <FormPresentationSettings
        canEdit={canEdit && !isPending}
        displayMode={displayMode}
        onChange={onDisplayModeChange}
      />
      <FormSectionBuilder
        canEdit={canEdit && !isPending}
        fields={fields}
        onAddField={onAddField}
        onAddSection={onAddSection}
        onDelete={onDeleteSection}
        onDeleteField={onDelete}
        onDuplicateField={onDuplicate}
        onEdit={onEditSection}
        onEditField={onEdit}
        onConfigureRules={setRuleField}
        onReorder={onReorderSections}
        onReorderFields={onReorderFields}
        sections={sections}
      />
      {ruleField ? (
        <FormFieldRulesDialog
          field={ruleField}
          fields={fields}
          sections={sections}
          onSave={onSave}
          onClose={() => setRuleField(undefined)}
        />
      ) : null}
      <FormSectionDialog
        fields={sectionVisibilityFields}
        isOpen={sectionDialogOpen}
        nextOrder={sections.length + 1}
        onClose={onCloseSectionDialog}
        onSave={onSaveSection}
        section={section}
      />
      <FormFieldDialog
        field={field?.id ? field : undefined}
        fields={fields}
        isOpen={dialogOpen}
        nextOrder={nextFieldOrder}
        onClose={onCloseDialog}
        onSave={onSave}
        sectionColumnSpan={fieldSection?.columnSpan}
        sectionId={fieldSectionId}
      />
      <ConfirmationDialog
        confirmText="Delete field"
        isDangerous
        isLoading={isPending}
        isOpen={Boolean(fieldToRemove)}
        message={`Delete ${fieldToRemove?.label ?? "this field"}? This only changes the mutable draft.`}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
        title="Delete form field"
      />
      <ConfirmationDialog
        confirmText="Delete section"
        isDangerous
        isLoading={isPending}
        isOpen={Boolean(sectionToRemove)}
        message={
          sectionFieldCount
            ? `Delete ${sectionToRemove?.title ?? "this section"} and its ${sectionFieldCount} field${sectionFieldCount === 1 ? "" : "s"}?`
            : `Delete ${sectionToRemove?.title ?? "this section"}?`
        }
        onCancel={onCancelSectionDelete}
        onConfirm={onConfirmSectionDelete}
        title="Delete form section"
      />
    </>
  );
}
