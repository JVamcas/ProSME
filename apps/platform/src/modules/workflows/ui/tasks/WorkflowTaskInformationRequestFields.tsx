"use client";

import { WorkflowRfiDeadlineFields } from "../rfi/WorkflowRfiDeadlineFields";
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
  const deadline = action.requiredInput.requestInformationDeadline;
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
      {deadline ? (
        <section
          aria-label="Response settings"
          className="grid gap-4 sm:grid-cols-2"
        >
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Enabled settings can be changed for this request. Other settings use
            the action defaults.
          </p>
          <WorkflowRfiDeadlineFields
            expiryAction={deadline.expiryAction}
            runtimeOverrides={
              deadline.runtimeOverrides ?? {
                deadlineDays: false,
                expiryAction: false,
                reminderDayOffsets: false,
              }
            }
          />
        </section>
      ) : null}
      <FormRichTextField
        label="Instructions for applicant"
        name="instructions"
        placeholder="Explain what information or documents the applicant should provide."
        required
      />
      <FormSelect
        disabled={fields.length === 0}
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
        placeholder={
          fields.length
            ? "Select fields for this request"
            : "No application fields available"
        }
        value={selectedFields}
      />
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This application has no editable answer fields. You can request a
          written clarification or any available applicant documents.
        </p>
      ) : null}
      {action.requiredInput.editableFieldPaths.includes(
        workflowRfiDetailedResponseFieldPath,
      ) ? (
        <CheckboxField
          description="Allow applicant to provide a written response to your request."
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
