"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { FormInput } from "@/components/ui/form-fields";
import { MoneyField } from "@/components/ui/money-field";
import {
  applicationFinancialSectionSchema,
  type ApplicationFinancialSection,
} from "@/modules/applications/ApplicationSchemas";
import {
  ApplicationFormActions,
  saveBeforeNavigate,
} from "./ApplicationFormActions";
import {
  ApplicationBudgetBreakdown,
  emptyBudgetItem,
} from "./ApplicationBudgetBreakdown";
import { useApplicationAutosave } from "./useApplicationAutosave";

const defaults: ApplicationFinancialSection = {
  amountRequested: 0,
  applicantContribution: 0,
  budgetBreakdown: [emptyBudgetItem],
  otherFundingSources: "",
  totalProjectCost: 0,
};

export function ApplicationFinancialForm({
  error,
  initial,
  onBack,
  onContinue,
  onSave,
  pending,
}: {
  error: boolean;
  initial: Partial<ApplicationFinancialSection>;
  onBack?: () => void;
  onContinue: (data: ApplicationFinancialSection) => Promise<unknown>;
  onSave: (data: ApplicationFinancialSection) => Promise<unknown>;
  pending: boolean;
}) {
  const form = useForm<ApplicationFinancialSection>({
    defaultValues: {
      ...defaults,
      ...initial,
      budgetBreakdown: initial.budgetBreakdown?.length
        ? initial.budgetBreakdown
        : [emptyBudgetItem],
    },
    resolver: zodResolver(applicationFinancialSectionSchema),
  });
  const autosave = useApplicationAutosave(form, onSave);
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onContinue)}>
        <div className="grid gap-5 sm:grid-cols-3">
          <MoneyField label="Total project cost" name="totalProjectCost" required />
          <MoneyField label="Amount requested" name="amountRequested" required />
          <MoneyField label="Your contribution" name="applicantContribution" required />
          <FormInput
            containerClassName="sm:col-span-3"
            label="Other funding sources"
            name="otherFundingSources"
          />
        </div>
        <ApplicationBudgetBreakdown />
        <ApplicationFormActions
          dirty={form.formState.isDirty}
          error={error}
          online={autosave.online}
          onBack={saveBeforeNavigate(
            () => onSave(form.getValues()),
            onBack,
          )}
          pending={pending || autosave.saving}
          onSave={() => {
            void onSave(form.getValues()).catch(() => undefined);
          }}
        />
      </form>
    </FormProvider>
  );
}
