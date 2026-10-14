"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import type { FormEditorView } from "@/modules/forms/FormTypes";
import { FormEditorLifecycleActions } from "./FormEditorLifecycleActions";
import { PageHeader } from "@/shared/ui/PageShell";

export function FormEditorTopSection({
  canPublish,
  canRetire,
  canUpdate,
  clonePending,
  editor,
  isDraft,
  isPublished,
  onClone,
  onEdit,
  onPreview,
  onPublish,
  onRetire,
  publishPending,
  retirePending,
  updatePending,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  clonePending: boolean;
  editor: FormEditorView;
  isDraft: boolean;
  isPublished: boolean;
  onClone: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onRetire: () => void;
  publishPending: boolean;
  retirePending: boolean;
  updatePending: boolean;
}) {
  return (
    <PageHeader
      title={`${editor.definition.name} - V${editor.version.versionNumber}`}
      description={editor.definition.description}
      eyebrow={"Settings / Forms"}
      actions={
        <div className="flex items-center gap-2">
          <FormEditorLifecycleActions
            canPublish={canPublish}
            canRetire={canRetire}
            canUpdate={canUpdate}
            clonePending={clonePending}
            isDraft={isDraft}
            isPublished={isPublished}
            onClone={onClone}
            onEdit={onEdit}
            onPreview={onPreview}
            onPublish={onPublish}
            onRetire={onRetire}
            publishPending={publishPending}
            retirePending={retirePending}
            updatePending={updatePending}
          />
          <StatusBadge status={editor.version.status} />
        </div>
      }
    />
  );
}
