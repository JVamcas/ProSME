"use client";

import { useCallback, useState } from "react";

import {
  useCloneForm,
  useFormEditor,
  useFormLifecycle,
  useUpdateForm,
} from "@/modules/forms/FormHooks";
import type { FormField, FormSection } from "@/modules/forms/FormTypes";

export function useFormEditorController(id: string) {
  const query = useFormEditor(id);
  const update = useUpdateForm(id);
  const clone = useCloneForm(id);
  const publish = useFormLifecycle("publish");
  const retire = useFormLifecycle("retire");
  const [field, setField] = useState<FormField>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldToRemove, setFieldToRemove] = useState<FormField>();
  const [section, setSection] = useState<FormSection>();
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [sectionToRemove, setSectionToRemove] = useState<FormSection>();
  const editor = query.data;
  const openNewField = useCallback(() => {
    setField(undefined);
    setDialogOpen(true);
  }, []);
  const openExistingField = useCallback((target: FormField) => {
    setField(target);
    setDialogOpen(true);
  }, []);
  const openNewSection = useCallback(() => {
    setSection(undefined);
    setSectionDialogOpen(true);
  }, []);
  const openExistingSection = useCallback((target: FormSection) => {
    setSection(target);
    setSectionDialogOpen(true);
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
      sections: editor.sections,
      submitLabel: editor.version.submitLabel,
    });
  }, [editor, field?.id, update]);
  const removeField = useCallback(() => {
    if (!editor || !fieldToRemove) return;
    update.mutate({
      expectedRowVersion: editor.version.rowVersion,
      fields: editor.fields.filter((item) => item.id !== fieldToRemove.id),
      instructions: editor.version.instructions,
      sections: editor.sections,
      submitLabel: editor.version.submitLabel,
    });
    setFieldToRemove(undefined);
  }, [editor, fieldToRemove, update]);
  const saveSection = useCallback((next: FormSection) => {
    if (!editor) return;
    const sections = section
      ? editor.sections.map((item) =>
          item.id === section.id ? { ...next, id: item.id } : item,
        )
      : [...editor.sections, next];
    update.mutate({
      expectedRowVersion: editor.version.rowVersion,
      fields: editor.fields,
      instructions: editor.version.instructions,
      sections,
      submitLabel: editor.version.submitLabel,
    });
  }, [editor, section, update]);
  const removeSection = useCallback(() => {
    if (!editor || !sectionToRemove) return;
    const sections = editor.sections
      .filter((item) => item.id !== sectionToRemove.id)
      .map((item, index) => ({ ...item, order: index + 1 }));
    update.mutate({
      expectedRowVersion: editor.version.rowVersion,
      fields: editor.fields,
      instructions: editor.version.instructions,
      sections,
      submitLabel: editor.version.submitLabel,
    });
    setSectionToRemove(undefined);
  }, [editor, sectionToRemove, update]);
  const reorderSections = useCallback((sections: FormSection[]) => {
    if (!editor) return;
    update.mutate({
      expectedRowVersion: editor.version.rowVersion,
      fields: editor.fields,
      instructions: editor.version.instructions,
      sections,
      submitLabel: editor.version.submitLabel,
    });
  }, [editor, update]);
  return {
    clone,
    dialogOpen,
    editor,
    field,
    fieldToRemove,
    openExistingField,
    openNewField,
    openExistingSection,
    openNewSection,
    publish,
    query,
    removeField,
    removeSection,
    reorderSections,
    retire,
    saveField,
    saveSection,
    section,
    sectionDialogOpen,
    sectionToRemove,
    setDialogOpen,
    setFieldToRemove,
    setSectionDialogOpen,
    setSectionToRemove,
    update,
  };
}
