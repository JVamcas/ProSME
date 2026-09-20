"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import type { FormEditorView } from "@/modules/forms/FormTypes";
import { FormEditorLifecycleActions } from "./FormEditorLifecycleActions";
import { PageHeader } from "@/components/ui/PageHeader";

export function FormEditorTopSection({
  canPublish,
  canRetire,
  canUpdate,
  clonePending,
  editor,
  isDraft,
  isPublished,
  onClone,
  onPreview,
  onPublish,
  onRetire,
  publishPending,
  retirePending,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  clonePending: boolean;
  editor: FormEditorView;
  isDraft: boolean;
  isPublished: boolean;
  onClone: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onRetire: () => void;
  publishPending: boolean;
  retirePending: boolean;
}) {
  return (
    <PageHeader
      title={`${editor.definition.name} - V${editor.version.versionNumber}`}
      description={editor.definition.description}
      eyebrow={"Settings / Forms"}
      actions={
        <div className="flex flex-row gap-2">
          <FormEditorLifecycleActions
            canPublish={canPublish}
            canRetire={canRetire}
            canUpdate={canUpdate}
            clonePending={clonePending}
            isDraft={isDraft}
            isPublished={isPublished}
            onClone={onClone}
            onPreview={onPreview}
            onPublish={onPublish}
            onRetire={onRetire}
            publishPending={publishPending}
            retirePending={retirePending}
          />
          <StatusBadge status={editor.version.status} />
        </div>
      }
    />
  );
}
