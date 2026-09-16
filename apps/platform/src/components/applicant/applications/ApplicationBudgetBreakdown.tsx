"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { GeneralButton, IconButton } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form-controls";
import { FormInput } from "@/components/ui/form-fields";
import { MoneyField } from "@/components/ui/money-field";
import type { ApplicationFinancialSection } from "@/modules/applications/ApplicationSchemas";

export const emptyBudgetItem = { amount: 0, category: "", description: "" };

export function ApplicationBudgetBreakdown() {
  const form = useFormContext<ApplicationFinancialSection>();
  const budgetErrors = form.formState.errors.budgetBreakdown;
  const budgetError = budgetErrors?.message ?? budgetErrors?.root?.message;
  const budget = useFieldArray({
    control: form.control,
    name: "budgetBreakdown",
  });
  return (
    <fieldset
      aria-describedby={budgetError ? "budget-breakdown-error" : undefined}
      className="mt-7 border-t border-brand-navy/10 pt-6"
    >
      <legend className="font-bold text-brand-navy">
        Budget breakdown
        <span aria-hidden="true" className="ml-1 text-brand-orange">*</span>
      </legend>
      <div className="mt-4 grid gap-4">
        {budget.fields.map((field, index) => (
          <div
            className="grid gap-3 rounded-xl bg-brand-cream/50 p-4 sm:grid-cols-[1fr_150px_1.4fr_auto]"
            key={field.id}
          >
            <FormInput
              label="Category"
              placeholder="e.g. Equipment, Materials"
              name={`budgetBreakdown.${index}.category`}
              required
            />
            <MoneyField
              label="Amount"
              name={`budgetBreakdown.${index}.amount`}
              required
            />
            <FormInput
              label="Description"
              placeholder="e.g. Laptops, Office supplies"
              name={`budgetBreakdown.${index}.description`}
              required
            />
            <IconButton
              className="self-end"
              disabled={budget.fields.length === 1}
              label={`Remove budget item ${index + 1}`}
              onClick={() => budget.remove(index)}
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </IconButton>
          </div>
        ))}
      </div>
      <FieldError
        id="budget-breakdown-error"
        message={budgetError}
      />
      <GeneralButton
        className="mt-4"
        onClick={() => budget.append(emptyBudgetItem)}
        type="button"
        variant="outline"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add item
      </GeneralButton>
    </fieldset>
  );
}
