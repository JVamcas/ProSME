"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";

const stageFormSchema = z.object({
  applicantDescription: z.string().trim().min(2).max(300),
  applicantLabel: z.string().trim().min(2).max(120),
  applicantStatus: z.enum([
    "SUBMITTED",
    "UNDER_REVIEW",
    "ACTION_REQUIRED",
    "OUTCOME_AVAILABLE",
    "CLOSED",
    "WITHDRAWN",
  ]),
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Use uppercase letters, numbers and underscores."),
  name: z.string().trim().min(2).max(160),
});

type StageFormValues = z.infer<typeof stageFormSchema>;

type Props = {
  editor: WorkflowEditorView;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (code: string) => void;
  stage?: WorkflowStageInput;
};

export function WorkflowStageCreateDialog({
  editor,
  isOpen,
  onClose,
  onCreated,
  stage,
}: Props) {
  const mutation = useSaveWorkflowGraph(editor);
  const form = useForm<StageFormValues>({
    defaultValues: {
      applicantDescription:
        stage?.applicantDescription ?? "Your application is being reviewed.",
      applicantLabel: stage?.applicantLabel ?? "Under review",
      applicantStatus: stage?.applicantStatus ?? "UNDER_REVIEW",
      code: stage?.code ?? "",
      name: stage?.name ?? "",
    },
    resolver: zodResolver(stageFormSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    const duplicate = editor.graph.stages.some(
      (item) => item.code === values.code && item.code !== stage?.code,
    );
    if (duplicate) {
      form.setError("code", { message: "Stage code must be unique." });
      return;
    }
    await mutation.mutateAsync({
      ...editor.graph,
      stages: stage
        ? editor.graph.stages.map((item) =>
            item.code === stage.code ? { ...item, ...values } : item,
          )
        : [
            ...editor.graph.stages,
            {
              ...values,
              initial: editor.graph.stages.length === 0,
              sequence: editor.graph.stages.length + 1,
              slaHours: null,
              tasks: [],
            },
          ],
      transitions: stage
        ? editor.graph.transitions.map((transition) => ({
            ...transition,
            fromStageCode:
              transition.fromStageCode === stage.code
                ? values.code
                : transition.fromStageCode,
            toStageCode:
              transition.toStageCode === stage.code
                ? values.code
                : transition.toStageCode,
          }))
        : editor.graph.transitions,
    });
    onCreated(values.code);
    onClose();
  });

  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={stage ? "Edit workflow stage" : "Add workflow stage"}
    >
      <FormProvider {...form}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <FormInput label="Stage code" name="code" placeholder="FINANCE_REVIEW" />
          <FormInput label="Stage name" name="name" placeholder="Finance review" />
          <FormSelect
            items={[
              { label: "Submitted", value: "SUBMITTED" },
              { label: "Under review", value: "UNDER_REVIEW" },
              { label: "Action required", value: "ACTION_REQUIRED" },
              { label: "Outcome available", value: "OUTCOME_AVAILABLE" },
              { label: "Closed", value: "CLOSED" },
              { label: "Withdrawn", value: "WITHDRAWN" },
            ]}
            label="Applicant status"
            name="applicantStatus"
          />
          <FormInput label="Applicant label" name="applicantLabel" />
          <FormTextarea
            containerClassName="md:col-span-2"
            label="Applicant description"
            name="applicantDescription"
            rows={3}
          />
          {mutation.error ? (
            <p className="md:col-span-2 text-sm text-red-700" role="alert">
              {mutation.error.message}
            </p>
          ) : null}
          <div className="flex justify-end md:col-span-2">
            <GeneralButton disabled={mutation.isPending} type="submit">
              {mutation.isPending
                ? "Saving…"
                : stage
                  ? "Save stage"
                  : "Add stage"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
