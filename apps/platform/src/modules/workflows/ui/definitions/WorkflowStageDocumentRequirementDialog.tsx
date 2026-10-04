"use client";

import { isSameWorkflowTaskRequirement } from "../../domain/definitions/WorkflowTaskRequirementIdentity";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowStageDocumentRequirement } from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  documentFileTypeItems,
  parseOptionalExpiryDays,
  workflowStageDocumentRequirementFormSchema,
  type WorkflowStageDocumentRequirementFormValues,
} from "./WorkflowStageDocumentRequirementFormSchema";

import { toast } from "@/shared/ui/Toast";

type Props = {
  editor: WorkflowEditorView;
  onClose: () => void;
  requirement?: WorkflowStageDocumentRequirement;
  stage: WorkflowStageInput;
};

export function WorkflowStageDocumentRequirementDialog({
  editor,
  onClose,
  requirement,
  stage,
}: Props) {
  const mutation = useSaveWorkflowGraph(editor);
  const form = useForm<WorkflowStageDocumentRequirementFormValues>({
    defaultValues: {
      acceptedFileTypes: requirement?.acceptedFileTypes ?? ["PDF"],
      expiryDays: requirement?.expiryDays ?? null,
      mandatory: requirement?.mandatory ?? true,
      maximumSizeMb: requirement?.maximumSizeMb ?? 10,
      name: requirement?.name ?? "",
      stableKey: requirement?.stableKey ?? "",
      requestOnStageActivation: requirement?.requestOnStageActivation ?? false,
      taskStableKey: requirement?.taskStableKey ?? "",
      templateReference: requirement?.templateReference ?? "",
    },
    resolver: zodResolver(workflowStageDocumentRequirementFormSchema),
  });
  const acceptedFileTypes = useWatch({
    control: form.control,
    name: "acceptedFileTypes",
  });

  const submit = form.handleSubmit(async (values) => {
    const duplicateKey = stage.documentRequirements.some(
      (item) =>
        item.taskStableKey === values.taskStableKey &&
        item.stableKey === values.stableKey &&
        !isSameWorkflowTaskRequirement(item, requirement),
    );
    if (duplicateKey) {
      form.setError("stableKey", {
        message: "Stable key must be unique in this task.",
      });
      return;
    }
    const duplicateName = stage.documentRequirements.some(
      (item) =>
        item.taskStableKey === values.taskStableKey &&
        item.name.toLowerCase() === values.name.toLowerCase() &&
        !isSameWorkflowTaskRequirement(item, requirement),
    );
    if (duplicateName) {
      form.setError("name", {
        message: "Document requirement name must be unique in this task.",
      });
      return;
    }
    const nextRequirement = {
      ...(requirement?.id ? { id: requirement.id } : {}),
      ...values,
      uploader: requirement?.uploader ?? "APPLICANT",
      verifier: requirement?.verifier ?? "ASSIGNED_REVIEWER",
    };
    await mutation.mutateAsync(
      {
        stages: editor.graph.stages.map((item) =>
          item.stableKey === stage.stableKey
            ? {
                ...item,
                documentRequirements: requirement
                  ? item.documentRequirements.map((current) =>
                      isSameWorkflowTaskRequirement(current, requirement)
                        ? nextRequirement
                        : current,
                    )
                  : [...item.documentRequirements, nextRequirement],
              }
            : item,
        ),
        transitions: editor.graph.transitions,
      },
      {
        onError: (error) => toast.error(error.message),
      },
    );
    onClose();
  });

  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      size="2xl"
      title={
        requirement ? "Edit document requirement" : "Add document requirement"
      }
    >
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <FormInput
            containerClassName="sm:col-span-2"
            disabled={Boolean(requirement)}
            infoTooltip="Immutable identifier used by conditions and runtime context."
            label="Stable key"
            name="stableKey"
            placeholder="TAX_CLEARANCE_CERTIFICATE"
            required
          />
          <FormInput
            containerClassName="sm:col-span-2"
            label="Document name"
            name="name"
            placeholder="Tax clearance certificate"
            required
          />
          <FormSelect
            items={stage.tasks.map((task) => ({
              label: task.name,
              value: task.stableKey,
            }))}
            label="Workflow task"
            infoTooltip="Workflow task in which this action is displayed."
            name="taskStableKey"
            placeholder={
              stage.tasks.length
                ? "Select a task"
                : "Add a task to this stage first"
            }
            required
          />
          <FormSelect
            items={documentFileTypeItems}
            label="Accepted file types"
            multiple
            name="acceptedFileTypes"
            onMultipleChange={(values) => {
              form.setValue(
                "acceptedFileTypes",
                values as WorkflowStageDocumentRequirementFormValues["acceptedFileTypes"],
                { shouldDirty: true, shouldValidate: true },
              );
            }}
            value={acceptedFileTypes}
          />
          <FormInput
            label="Maximum size (MB)"
            max={100}
            min={1}
            name="maximumSizeMb"
            registrationOptions={{ valueAsNumber: true }}
            required
            type="number"
          />
          <FormInput
            infoTooltip="Leave empty when the document does not expire."
            label="Expiry (days)"
            max={3650}
            min={1}
            name="expiryDays"
            registrationOptions={{ setValueAs: parseOptionalExpiryDays }}
            type="number"
          />
          <FormInput
            infoTooltip="Optional stable reference or URL for a document template."
            label="Template"
            name="templateReference"
            placeholder="TAX_CLEARANCE_TEMPLATE"
          />
          <CheckboxField
            containerClassName="sm:col-span-2"
            label="Is Mandatory"
            name="mandatory"
          />
          <CheckboxField
            containerClassName="sm:col-span-2"
            label="Automatically send request to applicant when stage activates."
            name="requestOnStageActivation"
          />
          <div className="flex justify-end sm:col-span-2">
            <GeneralButton disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving…" : "Save"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
