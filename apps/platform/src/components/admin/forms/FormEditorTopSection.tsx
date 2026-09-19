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
  onPublish: () => void;
  onRetire: () => void;
  publishPending: boolean;
  retirePending: boolean;
}) {
  return (
    <>
      <PageHeader
        title={editor.definition.name}
        description={editor.definition.description}
        eyebrow={"Settings / Forms"}
        actions={<StatusBadge status={editor.version.status} />}
      />
      <div className="flex flex-wrap gap-3">
        <FormEditorLifecycleActions
          canPublish={canPublish}
          canRetire={canRetire}
          canUpdate={canUpdate}
          clonePending={clonePending}
          isDraft={isDraft}
          isPublished={isPublished}
          onClone={onClone}
          onPublish={onPublish}
          onRetire={onRetire}
          publishPending={publishPending}
          retirePending={retirePending}
        />
      </div>
    </>
  );
}
