"use client";

import { useQueries } from "@tanstack/react-query";
import { useFormContext, useWatch } from "react-hook-form";
import { FormSelect } from "@/components/ui/form-fields";
import { usePublishedForms, formQueryKeys } from "@/modules/forms/FormHooks";
import { clientFormsService } from "@/modules/forms/ClientFormsService";
import { isWorkflowRfiEditableField } from "../../domain/runtime/WorkflowRfiFields";
import { workflowRfiDetailedResponseFieldPath } from "../../domain/runtime/WorkflowRfi";
import type { WorkflowActionFormValues } from "./WorkflowActionFormSchema";

export function WorkflowRfiFieldSelector() {
  const form = useFormContext<WorkflowActionFormValues>();
  const configured = useWatch({
    control: form.control,
    name: "editableFieldPaths",
  });
  const selected = configured
    .split(/[\n,]/)
    .map((path) => path.trim())
    .filter(Boolean);
  const published = usePublishedForms();
  const versions = (published.data ?? []).filter(
    (option) => option.purpose === "FUNDING_APPLICATION",
  );
  const queries = useQueries({
    queries: versions.map((version) => ({
      queryKey: formQueryKeys.publishedRuntime(version.versionId),
      queryFn: () => clientFormsService.getPublishedRuntime(version.versionId),
    })),
  });
  const options = new Map<string, string>([
    [workflowRfiDetailedResponseFieldPath, "Written clarification"],
  ]);
  for (const query of queries) {
    for (const field of query.data?.fields ?? []) {
      if (isWorkflowRfiEditableField(field))
        options.set(field.key, field.label);
    }
  }
  // Preserve existing selections when an older form version is no longer
  // published. Runtime checks still require a field in the applicant's form.
  for (const path of selected) {
    if (!options.has(path))
      options.set(path, `${path} (check application form)`);
  }
  return (
    <div className="sm:col-span-2">
      <FormSelect
        disabled={
          published.isPending || queries.some((query) => query.isPending)
        }
        infoTooltip="Choose fields staff may unlock. Staff select a subset for each request; only fields on the application's own form can be opened."
        items={[...options].map(([value, label]) => ({ value, label }))}
        label="Fields staff may unlock"
        multiple
        name="editableFieldPaths"
        onMultipleChange={(values) =>
          form.setValue("editableFieldPaths", values.join(", "), {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        placeholder="Select application fields"
        value={selected}
      />
      {published.isError || queries.some((query) => query.isError) ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          Unable to load application fields. Refresh and try again.
        </p>
      ) : null}
      <p className="mt-2 text-sm text-brand-navy/65">
        Leave empty for document-only requests. Written clarification requests a
        separate explanation and does not change an application answer.
      </p>
    </div>
  );
}
