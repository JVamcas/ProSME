"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import { CheckboxField } from "@/components/ui/form-field";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { conditionGroupSchema } from "@/modules/conditions/domain/ConditionSerialization";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { WorkflowConditionEditor } from "@/modules/workflows/ui/definitions/WorkflowConditionEditor";
import { useWorkflowConditionFields } from "@/modules/workflows/ui/definitions/useWorkflowConditionFields";

const stageFormSchema = z.object({
  stableKey: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Use uppercase letters, numbers and underscores."),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000),
  enabled: z.boolean(),
  optional: z.boolean(),
  repeatable: z.boolean(),
  coiGated: z.boolean(),
  entryCondition: conditionGroupSchema.nullable(),
  exitCondition: conditionGroupSchema.nullable(),
});

type StageFormValues = z.output<typeof stageFormSchema>;

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
  const form = useForm<
    z.input<typeof stageFormSchema>,
    unknown,
    StageFormValues
  >({
    defaultValues: {
      stableKey: stage?.stableKey ?? "",
      name: stage?.name ?? "",
      description: stage?.description ?? "",
      enabled: stage?.enabled ?? true,
      optional: stage?.optional ?? false,
      repeatable: stage?.repeatable ?? false,
      coiGated: stage?.coiGated ?? false,
      entryCondition: stage?.entryCondition ?? null,
      exitCondition: stage?.exitCondition ?? null,
    },
    resolver: zodResolver(stageFormSchema),
  });
  const conditionStage = stage ?? {
    actions: [],
    checklistItems: [],
    documentRequirements: [],
    scoring: null,
    coiGated: false,
    description: "",
    displayOrder: editor.graph.stages.length + 1,
    enabled: true,
    entryCondition: null,
    exitCondition: null,
    initial: editor.graph.stages.length === 0,
    name: "New stage",
    optional: false,
    publicStatusMapping: {
      description: "Application under review",
      label: "Under review",
      status: "UNDER_REVIEW" as const,
    },
    repeatable: false,
    slaHours: null,
    stableKey: "NEW_STAGE",
    tasks: [],
  } satisfies WorkflowStageInput;
  const conditionFields = useWorkflowConditionFields(editor, conditionStage);
  const submit = form.handleSubmit(async (values) => {
    const duplicate = editor.graph.stages.some(
      (item) =>
        item.stableKey === values.stableKey &&
        item.stableKey !== stage?.stableKey,
    );
    if (duplicate) {
      form.setError("stableKey", { message: "Stable key must be unique." });
      return;
    }
    await mutation.mutateAsync({
      ...editor.graph,
      stages: stage
        ? editor.graph.stages.map((item) =>
            item.stableKey === stage.stableKey ? { ...item, ...values } : item,
          )
        : [
            ...editor.graph.stages,
            {
              ...values,
              checklistItems: [],
              documentRequirements: [],
              scoring: null,
              initial: editor.graph.stages.length === 0,
              displayOrder: editor.graph.stages.length + 1,
              publicStatusMapping: {
                status: "UNDER_REVIEW" as const,
                label: "Under review",
                description: "Your application is being reviewed.",
              },
              slaHours: null,
              actions: [],
              tasks: [],
            },
          ],
      transitions: stage
        ? editor.graph.transitions.map((transition) => ({
            ...transition,
            sourceStageKey:
              transition.sourceStageKey === stage.stableKey
                ? values.stableKey
                : transition.sourceStageKey,
            targetStageKey:
              transition.targetStageKey === stage.stableKey
                ? values.stableKey
                : transition.targetStageKey,
          }))
        : editor.graph.transitions,
    });
    onCreated(values.stableKey);
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
          <FormInput
            label="Stable key"
            name="stableKey"
            placeholder="FINANCE_REVIEW"
          />
          <FormInput label="Stage name" name="name" placeholder="Finance review" />
          <FormTextarea
            containerClassName="md:col-span-2"
            label="Description"
            name="description"
            rows={3}
          />
          <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
            <CheckboxField label="Enabled" name="enabled" />
            <CheckboxField label="Optional" name="optional" />
            <CheckboxField label="Repeatable" name="repeatable" />
            <CheckboxField label="COI-gated" name="coiGated" />
          </div>
          <div className="space-y-4 md:col-span-2">
            <Controller
              control={form.control}
              name="entryCondition"
              render={({ field }) => (
                <WorkflowConditionEditor
                  fields={conditionFields.entryFields}
                  isPending={conditionFields.isPending}
                  label="Stage entry condition"
                  onChange={field.onChange}
                  value={field.value as ConditionGroup | null}
                />
              )}
            />
            <Controller
              control={form.control}
              name="exitCondition"
              render={({ field }) => (
                <WorkflowConditionEditor
                  fields={conditionFields.completionFields}
                  isPending={conditionFields.isPending}
                  label="Stage exit condition"
                  onChange={field.onChange}
                  value={field.value as ConditionGroup | null}
                />
              )}
            />
          </div>
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
