"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import type { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import { type CreateWorkflowTemplateInput } from "../../api/WorkflowTemplateSchemas";
import { workflowTemplateFormSchema } from "../../api/WorkflowTemplateFormSchema";
import type { WorkflowTemplateListItem } from "../../domain/definitions/WorkflowTemplate";
import {
  useCreateWorkflowTemplate,
  useUpdateWorkflowTemplateDefinition,
  useCopyWorkflowTemplate,
} from "../../WorkflowHooks";

type Props = {
  onCompleted: () => void;
  template?: WorkflowTemplateListItem;
  source?: WorkflowTemplateListItem;
};

export function WorkflowTemplateCreateForm({
  onCompleted,
  template,
  source,
}: Props) {
  const router = useRouter();
  const createMutation = useCreateWorkflowTemplate();
  const updateMutation = useUpdateWorkflowTemplateDefinition(
    template?.id ?? "",
  );
  const copyMutation = useCopyWorkflowTemplate(source?.id ?? "");
  const schema = workflowTemplateFormSchema(template?.code);
  const form = useForm<
    z.input<typeof schema>,
    unknown,
    CreateWorkflowTemplateInput
  >({
    defaultValues: {
      description: template?.description ?? source?.description ?? "",
      name: template?.name ?? (source ? `Copy of ${source.name}` : ""),
    },
    resolver: zodResolver(schema),
  });
  const submit = form.handleSubmit(async (input) => {
    try {
      if (template) {
        await updateMutation.mutateAsync({
          ...input,
          expectedUpdatedAt: template.updatedAt,
        });
      } else if (source) {
        const created = await copyMutation.mutateAsync({
          ...input,
          sourceVersionId: source.currentVersion.id,
        });
        router.push(
          `/admin/workflows/${created.definition.id}?versionId=${created.version.id}`,
        );
      } else {
        await createMutation.mutateAsync(input);
      }
      form.reset();
      onCompleted();
    } catch {
      // Mutation errors remain visible in the form so the user can retry.
    }
  });
  const mutation = template
    ? updateMutation
    : source
      ? copyMutation
      : createMutation;

  return (
    <FormProvider {...form}>
      <form className="grid gap-4" onSubmit={submit}>
        {source ? (
          <p className="text-sm text-brand-navy/70">
            Copy configuration from {source.name} v
            {source.currentVersion.number} into a new template with draft v1.
          </p>
        ) : null}
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
              ? template
                ? "Saving…"
                : "Creating…"
              : template
                ? "Save template"
                : "Create template"}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
