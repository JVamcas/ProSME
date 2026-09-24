"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import { formDefinitionDialogSchema } from "@/modules/forms/api/FormSchemas";
import type {
  CreateFormInput,
  UpdateFormInput,
} from "@/modules/forms/api/FormTransportTypes";
import type { FormEditorView } from "@/modules/forms/FormTypes";

type CreateProps = {
  editor?: never;
  mode: "create";
  mutation: UseMutationResult<FormEditorView, Error, CreateFormInput>;
  onCompleted: () => void;
};

type EditProps = {
  editor: FormEditorView;
  mode: "edit";
  mutation: UseMutationResult<FormEditorView, Error, UpdateFormInput>;
  onCompleted: () => void;
};

type Props = CreateProps | EditProps;

function defaultValues(props: Props): CreateFormInput {
  if (props.mode === "create") {
    return {
      code: "",
      description: "",
      displayMode: "SINGLE_PAGE",
      instructions: "",
      name: "",
      submitLabel: "Submit",
    };
  }
  return {
    code: props.editor.definition.code,
    description: props.editor.definition.description,
    displayMode: props.editor.version.displayMode,
    instructions: props.editor.version.instructions ?? "",
    name: props.editor.definition.name,
    submitLabel: props.editor.version.submitLabel,
  };
}

export function FormDefinitionDialogForm(props: Props) {
  const form = useForm<CreateFormInput>({
    defaultValues: defaultValues(props),
    resolver: zodResolver(formDefinitionDialogSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      if (props.mode === "create") {
        await props.mutation.mutateAsync(values);
      } else {
        await props.mutation.mutateAsync({
          ...values,
          expectedRowVersion: props.editor.version.rowVersion,
          fields: props.editor.fields,
          sections: props.editor.sections,
        });
      }
      props.onCompleted();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save the form.",
      );
    }
  });
  const actionLabel = props.mode === "create" ? "Create form" : "Save form";
  const pendingLabel = props.mode === "create" ? "Creating…" : "Saving…";
  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormInput
          label="Form code"
          name="code"
          placeholder="FINANCE_REVIEW"
          required
        />
        <FormInput
          label="Form name"
          name="name"
          placeholder="Finance Review"
          required
        />
        <FormTextarea label="Description" name="description" />
        <div className="flex justify-end">
          <GeneralButton disabled={props.mutation.isPending} type="submit">
            {props.mutation.isPending ? pendingLabel : actionLabel}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
