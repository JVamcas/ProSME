"use client";

import { GeneralButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { FormEditorView } from "@/modules/forms/FormTypes";
import { FormEditorLifecycleActions } from "./FormEditorLifecycleActions";

function EditorHeader({ editor }: { editor: FormEditorView }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
          {editor.definition.code}
        </p>
        <h1 className="text-3xl font-bold text-brand-navy">
          {editor.definition.name}
        </h1>
      </div>
      <StatusBadge status={editor.version.status} />
    </header>
  );
}

export function FormEditorTopSection({
  canPublish,
  canRetire,
  canUpdate,
  editor,
  isDraft,
  isPublished,
  onAddField,
  onAddSection,
  onClone,
  onPublish,
  onRetire,
  pending,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  editor: FormEditorView;
  isDraft: boolean;
  isPublished: boolean;
  onAddField: () => void;
  onAddSection: () => void;
  onClone: () => void;
  onPublish: () => void;
  onRetire: () => void;
  pending: boolean;
}) {
  return (
    <>
      <EditorHeader editor={editor} />
      <div className="flex flex-wrap gap-3">
        <GeneralButton
          disabled={!canUpdate || !isDraft}
          onClick={onAddSection}
          type="button"
        >
          Add section
        </GeneralButton>
        <GeneralButton
          disabled={!canUpdate || !isDraft}
          onClick={onAddField}
          type="button"
        >
          Add field
        </GeneralButton>
        <FormEditorLifecycleActions
          canPublish={canPublish}
          canRetire={canRetire}
          canUpdate={canUpdate}
          isDraft={isDraft}
          isPublished={isPublished}
          onClone={onClone}
          onPublish={onPublish}
          onRetire={onRetire}
          pending={pending}
        />
      </div>
    </>
  );
}
