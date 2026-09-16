"use client";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { FormFieldDialog } from "./FormFieldDialog";
import { FormFieldTable } from "./FormFieldTable";
import type { FormField } from "@/modules/forms/FormTypes";

export function FormEditorFieldSection({
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
}) {
  return (
    <>
      <FormFieldTable
        canUpdate={canEdit}
        fields={fields}
        onDelete={onDelete}
        onEdit={onEdit}
      />
      <FormFieldDialog
        field={field}
        isOpen={dialogOpen}
        onClose={onCloseDialog}
        onSave={onSave}
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
    </>
  );
}
