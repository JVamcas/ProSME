"use client";

import type { FormDisplayMode } from "@/modules/forms/FormTypes";

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
  onChange,
}: {
  canEdit: boolean;
  displayMode: FormDisplayMode;
  onChange: (displayMode: FormDisplayMode) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-brand-navy/10 bg-brand-white p-5">
      <legend className="px-1 font-bold text-brand-navy">Form presentation</legend>
      <p className="mb-4 text-sm text-brand-navy/65">
        Choose how sections are displayed when this form is rendered.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label
            className="flex cursor-pointer gap-3 rounded-xl border border-brand-navy/15 p-4 has-checked:border-brand-orange has-checked:bg-brand-orange/5"
            key={option.value}
          >
            <input
              checked={displayMode === option.value}
              className="mt-1 accent-brand-orange"
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
          </label>
        ))}
      </div>
    </fieldset>
  );
}
