"use client";

import { FormInput } from "@/components/ui/form-fields";

export function DocumentFieldLimits() {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-bold text-brand-navy">
        Document limits
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label="Maximum pages"
          min={1}
          name="maxPages"
          step={1}
          type="number"
        />
        <FormInput
          label="Maximum file size (MB)"
          min={1}
          max={10}
          name="maximumFileSizeMb"
          step={1}
          type="number"
        />
      </div>
      <p className="text-sm text-brand-navy/65">
        A page limit requires PDF uploads. Leave pages blank for no page limit.
        The default file-size limit is 10 MB.
      </p>
    </fieldset>
  );
}
