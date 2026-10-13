"use client";

import { useUploadWorkflowTaskDocument } from "./useWorkQueue";
import type { SaveTaskReviewDraftInput } from "../TaskTypes";
import type { WorkflowTaskWorkSectionsProps } from "@/modules/workflows/ui/WorkflowTaskWorkSections";

export function useWorkflowReviewDocumentUpload(
  taskId: string,
  readOnly: boolean,
  documents: NonNullable<SaveTaskReviewDraftInput["documents"]>,
  onPatch: (patch: SaveTaskReviewDraftInput) => void,
): WorkflowTaskWorkSectionsProps["documentUpload"] {
  const upload = useUploadWorkflowTaskDocument(taskId);
  if (readOnly) return undefined;
  return {
    taskId,
    error: upload.isError ? upload.error.message : undefined,
    pendingRequirementId: upload.isPending
      ? upload.variables?.requirementId
      : undefined,
    onFile: (requirementId, file) => {
      upload.mutate(
        { file, requirementId },
        {
          onSuccess: (updatedTask) => {
            const requirement = updatedTask.documentRequirements.find(
              (item) => item.id === requirementId,
            );
            if (!requirement) return;
            const existing = documents.find(
              (item) => item.category === requirement.stableKey,
            );
            onPatch({
              documents: [
                existing ?? {
                  category: requirement.stableKey,
                  comment: "",
                  outcome: "",
                },
              ],
            });
          },
        },
      );
    },
  };
}
