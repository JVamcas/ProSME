"use client";

import { useEffect } from "react";
import type { WidgetProps } from "@rjsf/utils";
import type { DocumentRequirementItem } from "@/modules/work-queue/TaskTypes";
import {
  useWorkflowTask,
  useUploadWorkflowTaskDocument,
} from "@/modules/work-queue/ui/useWorkQueue";
import { WorkflowTaskDocumentsSection } from "../WorkflowTaskDocumentsSection";

export function WorkflowFormDocumentWidget(props: WidgetProps) {
  const taskId = props.registry.formContext?.workflowTaskId as
    string | undefined;
  if (!taskId) {
    const requirement = props.options.requirement as
      DocumentRequirementItem | undefined;
    if (!requirement) {
      return (
        <p role="alert">Document requirement configuration is unavailable.</p>
      );
    }
    return (
      <WorkflowTaskDocumentsSection
        disabled
        preview
        requirements={[requirement]}
      />
    );
  }

  return <LoadedDocument {...props} taskId={taskId} />;
}

function LoadedDocument({
  taskId,
  options,
  disabled,
  readonly,
  value,
  onChange,
}: WidgetProps & { taskId: string }) {
  const task = useWorkflowTask(taskId);
  const upload = useUploadWorkflowTaskDocument(taskId);
  const requirement = task.data?.documentRequirements.find(
    (item) => item.stableKey === options.requirementKey,
  );
  const documentId = requirement?.document?.versionId;
  useEffect(() => {
    if (
      task.isSuccess &&
      requirement &&
      !disabled &&
      !readonly &&
      documentId !== value
    )
      onChange(documentId);
  }, [
    task.isSuccess,
    requirement,
    disabled,
    readonly,
    documentId,
    value,
    onChange,
  ]);
  if (task.isPending) return <p>Loading document…</p>;
  if (task.isError)
    return <p role="alert">Unable to load document evidence.</p>;
  if (!requirement)
    return (
      <p role="alert">Document requirement is unavailable for this task.</p>
    );
  return (
    <WorkflowTaskDocumentsSection
      disabled={Boolean(disabled || readonly || task.data?.readOnly)}
      taskId={taskId}
      requirements={[requirement]}
      upload={
        disabled || readonly || task.data?.readOnly
          ? undefined
          : {
              taskId,
              onFile: (requirementId, file) =>
                upload.mutate({ requirementId, file }),
              pendingRequirementId: upload.isPending
                ? requirement.id
                : undefined,
              error: upload.error?.message,
            }
      }
    />
  );
}
