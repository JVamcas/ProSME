"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import {
  workflowTemplateDetailsSchema,
  type CreateWorkflowTemplateInput,
} from "../../api/WorkflowTemplateSchemas";
import type { WorkflowTemplateListItem } from "../../domain/definitions/WorkflowTemplate";
import {
  useCreateWorkflowTemplate,
  useUpdateWorkflowDetails,
} from "../../WorkflowHooks";

type Props = {
  onCompleted: () => void;
  template?: WorkflowTemplateListItem;
};

export function WorkflowTemplateCreateForm({ onCompleted, template }: Props) {
  const createMutation = useCreateWorkflowTemplate();
  const updateMutation = useUpdateWorkflowDetails(template?.id ?? "");
  const form = useForm<
    z.input<typeof workflowTemplateDetailsSchema>,
    unknown,
    CreateWorkflowTemplateInput
  >({
    defaultValues: {
      code: template?.code ?? "",
      description: template?.description ?? "",
      name: template?.name ?? "",
    },
    resolver: zodResolver(workflowTemplateDetailsSchema),
  });
  const submit = form.handleSubmit(async (input) => {
    if (template) {
      await updateMutation.mutateAsync({
        ...input,
        expectedRowVersion: template.currentVersion.rowVersion,
      });
    } else {
      await createMutation.mutateAsync(input);
    }
    form.reset();
    onCompleted();
  });
  const mutation = template ? updateMutation : createMutation;

  return (
    <FormProvider {...form}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormInput
          label="Template code"
          name="code"
          placeholder="SME_STANDARD_GRANT"
          required
        />
        <FormInput
          label="Template name"
          name="name"
          placeholder="Standard grant workflow"
          required
        />
        <FormTextarea label="Description" name="description" rows={3} />
        {mutation.error ? (
          <p className="text-sm text-red-700" role="alert">
            {mutation.error.message}
          </p>
        ) : null}
        <div className="flex justify-end">
          <GeneralButton disabled={mutation.isPending} type="submit">
            {mutation.isPending
              ? (template ? "Saving…" : "Creating…")
              : (template ? "Save template" : "Create template")}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
