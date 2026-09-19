"use client";

import { FormEditorFieldSection } from "./FormEditorFieldSection";
import { FormVersionHistory } from "./FormVersionHistory";
import type { FormField, FormVersionSummary } from "@/modules/forms/FormTypes";
import type { FormSection } from "@/modules/forms/FormTypes";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { FormSectionBuilder } from "@/modules/forms/ui/builder/FormSectionBuilder";
import { FormSectionDialog } from "@/modules/forms/ui/builder/FormSectionDialog";

export function FormEditorBody({
  canEdit,
  dialogOpen,
  field,
  fieldToRemove,
  fields,
  isPending,
  onCancelDelete,
  onCloseDialog,
  onConfirmDelete,
  onDelete,
  onEdit,
  onSave,
  onCancelSectionDelete,
  onCloseSectionDialog,
  onConfirmSectionDelete,
  onDeleteSection,
  onEditSection,
  onReorderSections,
  onSaveSection,
  section,
  sectionDialogOpen,
  sections,
  sectionToRemove,
  versions,
}: {
  canEdit: boolean;
  dialogOpen: boolean;
  field?: FormField;
  fieldToRemove?: FormField;
  fields: FormField[];
  isPending: boolean;
  onCancelDelete: () => void;
  onCloseDialog: () => void;
  onConfirmDelete: () => void;
  onDelete: (field: FormField) => void;
  onEdit: (field: FormField) => void;
  onSave: (field: FormField) => void;
  onCancelSectionDelete: () => void;
  onCloseSectionDialog: () => void;
  onConfirmSectionDelete: () => void;
  onDeleteSection: (section: FormSection) => void;
  onEditSection: (section: FormSection) => void;
  onReorderSections: (sections: FormSection[]) => void;
  onSaveSection: (section: FormSection) => void;
  section?: FormSection;
  sectionDialogOpen: boolean;
  sections: FormSection[];
  sectionToRemove?: FormSection;
  versions: FormVersionSummary[];
}) {
  return (
    <>
      <FormSectionBuilder
        canEdit={canEdit && !isPending}
        onDelete={onDeleteSection}
        onEdit={onEditSection}
        onReorder={onReorderSections}
        sections={sections}
      />
      <FormSectionDialog
        isOpen={sectionDialogOpen}
        nextOrder={sections.length + 1}
        onClose={onCloseSectionDialog}
        onSave={onSaveSection}
        section={section}
      />
      <ConfirmationDialog
        confirmText="Delete section"
        isDangerous
        isLoading={isPending}
        isOpen={Boolean(sectionToRemove)}
        message={`Delete ${sectionToRemove?.title ?? "this section"}? This only changes the mutable draft.`}
        onCancel={onCancelSectionDelete}
        onConfirm={onConfirmSectionDelete}
        title="Delete form section"
      />
      <FormEditorFieldSection
        canEdit={canEdit}
        dialogOpen={dialogOpen}
        field={field}
        fieldToRemove={fieldToRemove}
        fields={fields}
        isPending={isPending}
        onCancelDelete={onCancelDelete}
        onCloseDialog={onCloseDialog}
        onConfirmDelete={onConfirmDelete}
        onDelete={onDelete}
        onEdit={onEdit}
        onSave={onSave}
      />
      <FormVersionHistory versions={versions} />
    </>
  );
}
