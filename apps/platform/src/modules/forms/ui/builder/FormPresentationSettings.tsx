"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { CheckboxField } from "@/shared/ui/FormField";
import { Input, Label } from "@/shared/ui/FormPrimitives";

import type { FormDisplayMode } from "@/modules/forms/FormTypes";

const presentationSchema = z.object({ showCompleteness: z.boolean() });

const options: Array<{
  description: string;
  label: string;
  value: FormDisplayMode;
}> = [
  {
    description: "Show every visible section together on one page.",
    label: "Single page",
    value: "SINGLE_PAGE",
  },
  {
    description: "Show one visible section at a time with Back and Next controls.",
    label: "Steps",
    value: "STEPS",
  },
];

export function FormPresentationSettings({
  canEdit,
  displayMode,
  showCompleteness,
  onShowCompletenessChange,
  onChange,
}: {
  canEdit: boolean;
  displayMode: FormDisplayMode;
  showCompleteness: boolean;
  onShowCompletenessChange: (show: boolean) => void;
  onChange: (displayMode: FormDisplayMode) => void;
}) {
  const form = useForm<z.infer<typeof presentationSchema>>({
    resolver: zodResolver(presentationSchema),
    values: { showCompleteness },
  });
  return (
    <fieldset className="rounded-2xl border border-brand-navy/10 bg-brand-white p-5">
      <legend className="px-1 font-bold text-brand-navy">Form presentation</legend>
      <p className="mb-4 text-sm text-brand-navy/65">
        Choose how sections are displayed when this form is rendered.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <Label
            unstyled
            className="flex cursor-pointer gap-3 rounded-xl border border-brand-navy/15 p-4 has-checked:border-brand-orange has-checked:bg-brand-orange/5"
            key={option.value}
          >
            <Input
              checked={displayMode === option.value}
              className="mt-1 size-4 shrink-0 accent-brand-orange"
              disabled={!canEdit}
              name="form-display-mode"
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            <span>
              <span className="block font-semibold text-brand-navy">
                {option.label}
              </span>
              <span className="mt-1 block text-sm text-brand-navy/65">
                {option.description}
              </span>
            </span>
          </Label>
        ))}
      </div>
      <Controller
        control={form.control}
        name="showCompleteness"
        render={({ field }) => (
          <CheckboxField
            checked={showCompleteness}
            containerClassName="mt-4"
            disabled={!canEdit}
            label="Show form completeness"
            description="Display the progress summary above the form in previews and live forms."
            onChange={(event) => {
              field.onChange(event.target.checked);
              void form.handleSubmit((values) => {
                onShowCompletenessChange(values.showCompleteness);
              })();
            }}
          />
        )}
      />
    </fieldset>
  );
}
