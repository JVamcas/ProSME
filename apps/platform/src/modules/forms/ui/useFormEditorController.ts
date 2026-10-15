"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import {
  useCloneForm,
  useFormEditor,
  useFormLifecycle,
  useUpdateForm,
} from "@/modules/forms/FormHooks";
import {
  formFieldIdentity,
  removeFormField,
  removeFormSectionFields,
} from "@/modules/forms/domain/FormFieldOrdering";
import type {
  FormDisplayMode,
  FormEditorView,
  FormField,
  FormSection,
} from "@/modules/forms/FormTypes";

function draftInput(editor: FormEditorView) {
  return {
    versionId: editor.version.id,
    expectedRowVersion: editor.version.rowVersion,
    displayMode: editor.version.displayMode,
    showCompleteness: editor.version.showCompleteness ?? true,
    instructions: editor.version.instructions,
    submitLabel: editor.version.submitLabel,
    fields: editor.fields,
    sections: editor.sections,
  };
}

export function useFormEditorController(id: string, versionId?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useFormEditor(id, versionId);
  const update = useUpdateForm(id);
  const clone = useCloneForm();
  const publish = useFormLifecycle("publish");
  const retire = useFormLifecycle("retire");
  const [field, setField] = useState<FormField>();
  const [fieldSectionId, setFieldSectionId] = useState<string>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldToRemove, setFieldToRemove] = useState<FormField>();
  const [section, setSection] = useState<FormSection>();
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [sectionToRemove, setSectionToRemove] = useState<FormSection>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const editor = query.data;
  const openNewField = useCallback((sectionId: string) => {
    setField(undefined);
    setFieldSectionId(sectionId);
    setDialogOpen(true);
  }, []);
  const openExistingField = useCallback((target: FormField) => {
    setField(target);
    setFieldSectionId(target.sectionId);
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
  const saveField = useCallback(
    async (next: FormField) => {
      if (!editor) return;
      const fields =
        next.id && editor.fields.some((item) => item.id === next.id)
          ? editor.fields.map((item) =>
              item.id === next.id ? { ...next, id: item.id } : item,
            )
          : [...editor.fields, next];
      await update.mutateAsync({
        ...draftInput(editor),
        fields,
        sections: editor.sections,
      });
    },
    [editor, update],
  );
  const removeField = useCallback(() => {
    if (!editor || !fieldToRemove) return;
    update.mutate({
      ...draftInput(editor),
      fields: removeFormField(editor.fields, formFieldIdentity(fieldToRemove)),
      sections: editor.sections,
    });
    setFieldToRemove(undefined);
  }, [editor, fieldToRemove, update]);
  const saveSection = useCallback(
    async (next: FormSection) => {
      if (!editor) return;
      const sections = section
        ? editor.sections.map((item) =>
            item.id === section.id ? { ...next, id: item.id } : item,
          )
        : [...editor.sections, next];
      await update.mutateAsync({
        ...draftInput(editor),
        fields: editor.fields,
        sections,
      });
    },
    [editor, section, update],
  );
  const removeSection = useCallback(() => {
    if (!editor || !sectionToRemove) return;
    const sections = editor.sections
      .filter((item) => item.id !== sectionToRemove.id)
      .map((item, index) => ({ ...item, order: index + 1 }));
    update.mutate({
      ...draftInput(editor),
      fields: removeFormSectionFields(editor.fields, sectionToRemove.id ?? ""),
      sections,
    });
    setSectionToRemove(undefined);
  }, [editor, sectionToRemove, update]);
  const reorderSections = useCallback(
    (sections: FormSection[]) => {
      if (!editor) return;
      update.mutate({
        ...draftInput(editor),
        fields: editor.fields,
        sections,
      });
    },
    [editor, update],
  );
  const reorderFields = useCallback(
    (fields: FormField[], onError?: (error: Error) => void) => {
      if (!editor) return;
      update.mutate(
        {
          ...draftInput(editor),
          fields,
          sections: editor.sections,
        },
        { onError },
      );
    },
    [editor, update],
  );
  const updateDisplayMode = useCallback(
    (displayMode: FormDisplayMode) => {
      if (!editor || displayMode === editor.version.displayMode) return;
      update.mutate({
        ...draftInput(editor),
        displayMode,
        fields: editor.fields,
        sections: editor.sections,
      });
    },
    [editor, update],
  );
  const updateShowCompleteness = useCallback(
    (showCompleteness: boolean) => {
      if (!editor) return;
      update.mutate({
        ...draftInput(editor),
        showCompleteness,
      });
    },
    [editor, update],
  );
  function editPublishedVersion() {
    if (!editor) return;
    clone.mutate(
      { definitionId: id, sourceVersionId: editor.version.id },
      {
        onSuccess: (view) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("versionId", view.version.id);
          router.replace(`${pathname}?${params}`);
        },
      },
    );
  }
  return {
    clone,
    editPublishedVersion,
    dialogOpen,
    editor,
    field,
    fieldSectionId,
    fieldToRemove,
    openExistingField,
    openNewField,
    openExistingSection,
    openNewSection,
    publish,
    previewOpen,
    query,
    removeField,
    removeSection,
    reorderFields,
    reorderSections,
    retire,
    saveField,
    saveSection,
    section,
    sectionDialogOpen,
    sectionToRemove,
    setDialogOpen,
    setFieldToRemove,
    setPreviewOpen,
    setSectionDialogOpen,
    setSectionToRemove,
    update,
    updateDisplayMode,
    updateShowCompleteness,
  };
}
