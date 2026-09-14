"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { FormTextarea } from "@/components/ui/form-fields";
import { useUpdateWorkflow } from "@/modules/workflows/WorkflowHooks";
import { workflowGraphSchema } from "@/modules/workflows/WorkflowSchemas";
import type {
  WorkflowEditorView,
  WorkflowGraphInput,
} from "@/modules/workflows/WorkflowTypes";

function parseGraph(value: string): WorkflowGraphInput | null {
  try {
    const result = workflowGraphSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

const graphFormSchema = z.object({
  graphJson: z
    .string()
    .min(2)
    .refine(
      (value) => parseGraph(value) !== null,
      "Enter a valid workflow graph.",
    ),
});
type GraphFormValues = z.infer<typeof graphFormSchema>;

export function WorkflowGraphForm({ editor }: { editor: WorkflowEditorView }) {
  const mutation = useUpdateWorkflow(editor.definition.id);
  const form = useForm<GraphFormValues>({
    defaultValues: { graphJson: JSON.stringify(editor.graph, null, 2) },
    resolver: zodResolver(graphFormSchema),
  });
  const submit = form.handleSubmit(async ({ graphJson }) => {
    const graph = parseGraph(graphJson);
    if (!graph) return;
    await mutation.mutateAsync({
      expectedRowVersion: editor.version.rowVersion,
      graph,
    });
  });
  return (
    <FormProvider {...form}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormTextarea
          className="min-h-[460px] font-mono text-xs"
          label="Workflow graph configuration"
          name="graphJson"
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-brand-navy/60">
            Codes, ordering, assignments, applicant labels, task configuration
            and transitions are versioned together.
          </p>
          <GeneralButton disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Saving…" : "Save draft"}
          </GeneralButton>
        </div>
        {mutation.error ? (
          <p className="text-sm text-brand-navy" role="alert">
            {mutation.error.message}
          </p>
        ) : null}
      </form>
    </FormProvider>
  );
}
