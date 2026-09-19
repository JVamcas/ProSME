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
import { useCreateWorkflowTemplate } from "../../WorkflowHooks";

type Props = {
  onCreated: () => void;
};

export function WorkflowTemplateCreateForm({ onCreated }: Props) {
  const mutation = useCreateWorkflowTemplate();
  const form = useForm<
    z.input<typeof workflowTemplateDetailsSchema>,
    unknown,
    CreateWorkflowTemplateInput
  >({
    defaultValues: {
      code: "",
      description: "",
      name: "",
    },
    resolver: zodResolver(workflowTemplateDetailsSchema),
  });
  const submit = form.handleSubmit(async (input) => {
    await mutation.mutateAsync(input);
    form.reset();
    onCreated();
  });

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
            {mutation.isPending ? "Creating…" : "Create template"}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
