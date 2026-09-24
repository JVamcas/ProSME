"use client";

import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import type { FormEditorView, FormRuntimeSchema } from "@/modules/forms/FormTypes";
import { formColumnCount, previewPanelClass } from "./FormLayout";
import { FormRenderer, type DynamicFormValues } from "./FormRenderer";

function runtimeDefinition(editor: FormEditorView): FormRuntimeSchema {
  return {
    displayMode: editor.version.displayMode,
    fields: editor.fields,
    instructions: editor.version.instructions,
    sections: editor.sections,
    submitLabel: editor.version.submitLabel,
    versionId: editor.version.id,
    versionNumber: editor.version.versionNumber,
  };
}

function FormPreviewContent({
  editor,
  onClose,
}: {
  editor: FormEditorView;
  onClose: () => void;
}) {
  const [values, setValues] = useState<DynamicFormValues>({});
  if (editor.sections.length === 0 || editor.fields.length === 0) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-brand-navy/65">
          Add at least one section and field to preview this form.
        </p>
        <div className="flex justify-end">
          <GeneralButton onClick={onClose} type="button" variant="outline">
            Close
          </GeneralButton>
        </div>
      </div>
    );
  }
  return (
    <>
      <p className="mb-5 text-sm text-brand-navy/65">
        Preview only. Values entered here will not be saved.
      </p>
      <FormRenderer
        definition={runtimeDefinition(editor)}
        formData={values}
        onChange={setValues}
        onSubmit={() => undefined}
      >
        <div className="mt-6 flex justify-end gap-3 border-t border-brand-navy/10 pt-5">
          <GeneralButton onClick={onClose} type="button" variant="outline">
            Close
          </GeneralButton>
          <GeneralButton type="submit">
            {editor.version.submitLabel}
          </GeneralButton>
        </div>
      </FormRenderer>
    </>
  );
}

export function FormPreviewDialog({
  editor,
  isOpen,
  onClose,
}: {
  editor: FormEditorView;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      panelClassName={previewPanelClass(formColumnCount(editor.sections))}
      size="2xl"
      title={`${editor.definition.name} preview`}
    >
      <FormPreviewContent editor={editor} onClose={onClose} />
    </DraggableDialog>
  );
}
