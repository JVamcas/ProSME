"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import { eligibilityRuleSetCreateSchema } from "../api/EligibilityRuleSetSchemas";
import type { CreateEligibilityRuleSetInput } from "../api/EligibilityRuleSetTransport";

export function EligibilityRuleSetCreateForm({
  initialValues,
  mutation,
  onSaved,
}: {
  initialValues?: CreateEligibilityRuleSetInput;
  mutation: UseMutationResult<
    { definition: { id: string } },
    Error,
    CreateEligibilityRuleSetInput
  >;
  onSaved: (id: string) => void;
}) {
  const form = useForm<CreateEligibilityRuleSetInput>({
    defaultValues: initialValues ?? { code: "", description: "", name: "" },
    resolver: zodResolver(eligibilityRuleSetCreateSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      const created = await mutation.mutateAsync(values);
      onSaved(created.definition.id);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save the eligibility ruleset.",
      );
    }
  });

  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormInput
          label="Ruleset code"
          name="code"
          placeholder="SME_FUND_ELIGIBILITY"
          required
        />
        <FormInput
          label="Ruleset name"
          name="name"
          placeholder="SME Fund eligibility"
          required
        />
        <FormTextarea label="Description" name="description" />
        <div className="flex justify-end">
          <GeneralButton disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Saving" : "Save"}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
