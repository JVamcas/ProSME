"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowStageDocumentRequirement } from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  documentActorItems,
  documentFileTypeItems,
  documentVerifierItems,
  workflowStageDocumentRequirementFormSchema,
  type WorkflowStageDocumentRequirementFormValues,
} from "./WorkflowStageDocumentRequirementFormSchema";

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
      templateReference: requirement?.templateReference ?? "",
      uploader: requirement?.uploader ?? "APPLICANT",
      verifier: requirement?.verifier ?? "ASSIGNED_REVIEWER",
    },
    resolver: zodResolver(workflowStageDocumentRequirementFormSchema),
  });
  const acceptedFileTypes = useWatch({
    control: form.control,
    name: "acceptedFileTypes",
  });

  const submit = form.handleSubmit(async (values) => {
    const duplicateName = stage.documentRequirements.some(
      (item) =>
        item.name.toLowerCase() === values.name.toLowerCase()
        && item.name !== requirement?.name,
    );
    if (duplicateName) {
      form.setError("name", {
        message: "Document requirement name must be unique in this stage.",
      });
      return;
    }
    const nextRequirement = {
      ...(requirement?.id ? { id: requirement.id } : {}),
      ...values,
    };
    await mutation.mutateAsync({
      stages: editor.graph.stages.map((item) =>
        item.stableKey === stage.stableKey
          ? {
              ...item,
              documentRequirements: requirement
                ? item.documentRequirements.map((current) =>
                    current.name === requirement.name
                      ? nextRequirement
                      : current,
                  )
                : [...item.documentRequirements, nextRequirement],
            }
          : item,
      ),
      transitions: editor.graph.transitions,
    });
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
            label="Document name"
            name="name"
            placeholder="Tax clearance certificate"
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
                values as WorkflowStageDocumentRequirementFormValues[
                  "acceptedFileTypes"
                ],
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
            registrationOptions={{
              setValueAs: (value) => value === "" ? null : Number(value),
            }}
            type="number"
          />
          <FormInput
            infoTooltip="Optional stable reference or URL for a document template."
            label="Template"
            name="templateReference"
            placeholder="TAX_CLEARANCE_TEMPLATE"
          />
          <FormSelect
            items={documentActorItems}
            label="Uploader"
            name="uploader"
            required
          />
          <FormSelect
            items={documentVerifierItems}
            label="Verifier"
            name="verifier"
            required
          />
          <CheckboxField
            containerClassName="sm:col-span-2"
            label="Is Mandatory"
            name="mandatory"
          />
          {mutation.error ? (
            <p className="text-sm text-red-700 sm:col-span-2" role="alert">
              {mutation.error.message}
            </p>
          ) : null}
          <div className="flex justify-end sm:col-span-2">
            <GeneralButton disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving…" : "Save document requirement"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
