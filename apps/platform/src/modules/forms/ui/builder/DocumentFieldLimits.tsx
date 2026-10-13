"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { formFieldSchema } from "../../api/FormSchemas";
import {
  defaultFormDocumentExtensions,
  formDocumentExtensions,
  type FormDocumentExtension,
} from "../../domain/FormDocumentTypes";
import { FormInput, FormSelect } from "@/components/ui/form-fields";

export function DocumentFieldLimits() {
  const form = useFormContext<z.input<typeof formFieldSchema>>();
  const { setValue } = form;
  const maxPages = useWatch({ control: form.control, name: "maxPages" });
  const acceptedExtensions = useWatch({
    control: form.control,
    name: "acceptedExtensions",
  });
  const pageLimited = String(maxPages ?? "").trim() !== "";
  useEffect(() => {
    if (pageLimited) {
      setValue("acceptedExtensions", [".pdf"], { shouldValidate: true });
    }
  }, [setValue, pageLimited]);

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-bold text-brand-navy">
        Document limits
      </legend>
      <FormSelect
        disabled={pageLimited}
        items={formDocumentExtensions.map((value) => ({
          disabled: pageLimited,
          label: value.slice(1).toUpperCase(),
          value,
        }))}
        label="Allowed file types"
        multiple
        name="acceptedExtensions"
        onMultipleChange={(values) =>
          form.setValue(
            "acceptedExtensions",
            values as FormDocumentExtension[],
            { shouldDirty: true, shouldValidate: true },
          )
        }
        value={
          pageLimited
            ? [".pdf"]
            : (acceptedExtensions ?? defaultFormDocumentExtensions)
        }
      />
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
