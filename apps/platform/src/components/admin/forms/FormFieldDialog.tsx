"use client";

import { DraggableDialog } from "@/components/ui/draggable-dialog";
import type { FormField } from "@/modules/forms/FormTypes";
import { FieldDialogForm } from "./FieldDialogForm";
import {
  useFormFieldDialogController,
} from "./FormFieldDialogController";

export function FormFieldDialog({
  field,
  isOpen,
  onClose,
  onSave,
}: {
  field?: FormField;
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: FormField) => void;
}) {
  const { form, inputType, options } = useFormFieldDialogController(field);
  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      title={field ? "Edit field" : "Add field"}
    >
      <FieldDialogForm
        form={form}
        inputType={inputType}
        onSubmit={(values) => {
          onSave(values as FormField);
          onClose();
        }}
        options={options}
      />
    </DraggableDialog>
  );
}
