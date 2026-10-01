"use client";

import type { usePublishedFormRuntime } from "@/modules/forms/FormHooks";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";

export function WorkflowTaskFormPreview({
  form,
}: {
  form: ReturnType<typeof usePublishedFormRuntime>;
}) {
  if (form.isPending) return <p className="text-sm">Loading form preview…</p>;
  if (form.isError || !form.data) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {form.error?.message ?? "The bound form is unavailable."}
      </p>
    );
  }
  return (
    <FormRenderer
      definition={form.data}
      formData={{}}
      onChange={() => undefined}
      onSubmit={() => undefined}
      readOnly
    >
      <></>
    </FormRenderer>
  );
}
