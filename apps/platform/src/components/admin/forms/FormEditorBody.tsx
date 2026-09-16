"use client";

import { FormEditorFieldSection } from "./FormEditorFieldSection";
import { FormVersionHistory } from "./FormVersionHistory";
import type { FormField, FormVersionSummary } from "@/modules/forms/FormTypes";

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
  versions: FormVersionSummary[];
}) {
  return (
    <>
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
