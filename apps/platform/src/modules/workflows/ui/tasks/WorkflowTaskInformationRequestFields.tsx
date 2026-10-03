"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { CheckboxField } from "@/components/ui/form-field";
import { FormSelect } from "@/components/ui/form-fields";
import { FormRichTextField } from "@/shared/ui/FormRichTextField";
import type {
  TaskDetail,
  WorkflowTaskAction,
} from "@/modules/work-queue/TaskTypes";
import { workflowRfiDetailedResponseFieldPath } from "../../domain/runtime/WorkflowRfi";
import type { ActionValues } from "./WorkflowTaskActionForm";

export function WorkflowTaskInformationRequestFields({
  action,
  task,
}: {
  action: WorkflowTaskAction;
  task: TaskDetail;
}) {
  const form = useFormContext<ActionValues>();
  const selectedFields = useWatch({
    control: form.control,
    name: "editableFieldPaths",
  });
  const selectedDocuments = useWatch({
    control: form.control,
    name: "requestedDocumentRequirementIds",
  });
  const fields = (action.requiredInput.editableFields ?? []).filter(
    (field) => field.path !== workflowRfiDetailedResponseFieldPath,
  );
  const documents = task.documentRequirements.filter(
    (requirement) =>
      requirement.id &&
      requirement.uploader === "APPLICANT" &&
      requirement.requestStatus === "MISSING",
  );
  return (
    <>
      <FormRichTextField
        label="Instructions for applicant"
        name="instructions"
        placeholder="Explain what information or documents the applicant should provide."
        required
      />
      {fields.length ? (
        <FormSelect
          infoTooltip="Only the fields you select will open for this applicant. Other application answers remain locked."
          items={fields.map((field) => ({
            label: field.label,
            value: field.path,
          }))}
          label="Application fields to open"
          multiple
          name="editableFieldPaths"
          onMultipleChange={(values) =>
            form.setValue("editableFieldPaths", values, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          placeholder="Select fields for this request"
          value={selectedFields}
        />
      ) : null}
      {action.requiredInput.editableFieldPaths.includes(
        workflowRfiDetailedResponseFieldPath,
      ) ? (
        <CheckboxField
          description="Ask for a separate written explanation. This does not open application fields."
          label="Request written clarification"
          name="requestDetailedInformation"
        />
      ) : null}
      {documents.length ? (
        <FormSelect
          items={documents.map((requirement) => ({
            label: requirement.name,
            value: requirement.id!,
          }))}
          label="Missing applicant documents"
          multiple
          name="requestedDocumentRequirementIds"
          onMultipleChange={(values) =>
            form.setValue("requestedDocumentRequirementIds", values, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          value={selectedDocuments}
        />
      ) : null}
    </>
  );
}
