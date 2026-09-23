"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import {
  eligibilityQuestionInputSchema,
  type EligibilityQuestionInput,
} from "../api/EligibilityQuestionSchemas";

const inputTypes = [
  { label: "Yes / No", value: "BOOLEAN" },
  { label: "Yes / No / Not applicable", value: "YES_NO_NA" },
  { label: "Text", value: "TEXT" },
  { label: "Number", value: "NUMBER" },
  { label: "Percentage", value: "PERCENTAGE" },
  { label: "Date", value: "DATE" },
];

export function EligibilityQuestionForm({
  initialValues,
  error,
  pending,
  save,
  onSaved,
}: {
  error?: Error | null;
  initialValues?: EligibilityQuestionInput;
  onSaved: () => void;
  pending: boolean;
  save: (input: EligibilityQuestionInput) => Promise<unknown>;
}) {
  const form = useForm<EligibilityQuestionInput>({
    defaultValues: initialValues ?? {
      applicantLabel: "",
      code: "",
      inputType: "BOOLEAN",
      reviewerLabel: "",
    },
    resolver: zodResolver(eligibilityQuestionInputSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    await save(values);
    onSaved();
  });
  return (
    <FormProvider {...form}>
      <form className="space-y-5" onSubmit={submit}>
        <FormInput
          label="Code"
          name="code"
          placeholder="NAMRA_STANDING"
          required
        />
        <FormSelect
          items={inputTypes}
          label="Input type"
          name="inputType"
          required
        />
        <FormInput
          label="Applicant label"
          name="applicantLabel"
          required
        />
        <FormInput
          label="Reviewer label"
          name="reviewerLabel"
          required
        />
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error.message}
          </p>
        ) : null}
        <div className="flex justify-end">
          <GeneralButton disabled={pending} type="submit">
            {pending ? "Saving…" : "Save question"}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
