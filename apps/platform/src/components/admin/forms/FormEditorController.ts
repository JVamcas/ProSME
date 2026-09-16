"use client";

import { useCallback, useState } from "react";

import {
  useCloneForm,
  useFormEditor,
  useFormLifecycle,
  useUpdateForm,
} from "@/modules/forms/FormHooks";
import type { FormField } from "@/modules/forms/FormTypes";

export function useFormEditorController(id: string) {
  const query = useFormEditor(id);
  const update = useUpdateForm(id);
  const clone = useCloneForm(id);
  const publish = useFormLifecycle("publish");
  const retire = useFormLifecycle("retire");
  const [field, setField] = useState<FormField>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldToRemove, setFieldToRemove] = useState<FormField>();
  const editor = query.data;
  const openNewField = useCallback(() => {
    setField(undefined);
    setDialogOpen(true);
  }, []);
  const openExistingField = useCallback((target: FormField) => {
    setField(target);
    setDialogOpen(true);
  }, []);
  const saveField = useCallback((next: FormField) => {
    if (!editor) return;
    const fields = editor.fields.some((item) => item.id === field?.id)
      ? editor.fields.map((item) =>
          item.id === field?.id ? { ...next, id: item.id } : item,
        )
      : [...editor.fields, next];
    update.mutate({
      expectedRowVersion: editor.version.rowVersion,
      fields,
      instructions: editor.version.instructions,
      submitLabel: editor.version.submitLabel,
    });
  }, [editor, field?.id, update]);
  const removeField = useCallback(() => {
    if (!editor || !fieldToRemove) return;
    update.mutate({
      expectedRowVersion: editor.version.rowVersion,
      fields: editor.fields.filter((item) => item.id !== fieldToRemove.id),
      instructions: editor.version.instructions,
      submitLabel: editor.version.submitLabel,
    });
    setFieldToRemove(undefined);
  }, [editor, fieldToRemove, update]);
  return {
    clone,
    dialogOpen,
    editor,
    field,
    fieldToRemove,
    openExistingField,
    openNewField,
    publish,
    query,
    removeField,
    retire,
    saveField,
    setDialogOpen,
    setFieldToRemove,
    update,
  };
}
