"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import { formDefinitionDialogSchema } from "@/modules/forms/FormSchemas";
import type {
  CreateFormInput,
  UpdateFormInput,
} from "@/modules/forms/FormTransportTypes";
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
      instructions: "",
      name: "",
      submitLabel: "Submit",
    };
  }
  return {
    code: props.editor.definition.code,
    description: props.editor.definition.description,
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
    if (props.mode === "create") {
      await props.mutation.mutateAsync(values);
    } else {
      await props.mutation.mutateAsync({
        ...values,
        expectedRowVersion: props.editor.version.rowVersion,
        fields: props.editor.fields,
      });
    }
    props.onCompleted();
  });
  const actionLabel = props.mode === "create" ? "Create form" : "Save form";
  const pendingLabel = props.mode === "create" ? "Creating…" : "Saving…";
  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormInput label="Form code" name="code" placeholder="FINANCE_REVIEW" />
        <FormInput label="Form name" name="name" placeholder="Finance Review" />
         <FormInput label="Submit button label" name="submitLabel" />
        <FormTextarea label="Description" name="description" />
        {props.mutation.error ? (
          <p className="text-sm text-red-700" role="alert">
            {props.mutation.error.message}
          </p>
        ) : null}
        <div className="flex justify-end">
          <GeneralButton disabled={props.mutation.isPending} type="submit">
            {props.mutation.isPending ? pendingLabel : actionLabel}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
