"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import type { ReportDataset } from "../../domain/ReportDataset";
import { ReportSqlEditor } from "./ReportSqlEditor";
import { ReportTemplateMetadataFields } from "./ReportTemplateMetadataFields";
import type {
  ReportTemplateFormValues,
  ReportTemplateStep,
} from "./useReportTemplateSteps";

export function ReportTemplateStepContent({
  step,
  datasets,
  disabled,
}: {
  step: ReportTemplateStep;
  datasets: ReportDataset[];
  disabled: boolean;
}) {
  const form = useFormContext<ReportTemplateFormValues>();
  const definition = useWatch({ control: form.control, name: "definition" });
  const description = useWatch({ control: form.control, name: "description" });
  const name = useWatch({ control: form.control, name: "name" });
  const selected = datasets.find(
    (dataset) =>
      dataset.key === definition.datasetKey &&
      dataset.version === definition.datasetVersion,
  );

  if (step === "details") {
    return (
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <FormInput label="Name" name="name" />
        <FormSelect
          label="Dataset/version"
          value={`${definition.datasetKey}/${definition.datasetVersion}`}
          items={datasets.map((dataset) => ({
            value: `${dataset.key}/${dataset.version}`,
            label: `${dataset.name} · v${dataset.version}`,
          }))}
          onChange={(event) => {
            const dataset = datasets.find(
              (item) => `${item.key}/${item.version}` === event.target.value,
            );
            if (!dataset) return;
            form.setValue("definition.datasetKey", dataset.key, {
              shouldDirty: true,
            });
            form.setValue("definition.datasetVersion", dataset.version, {
              shouldDirty: true,
            });
          }}
        />
        {selected ? (
          <p className="text-sm text-slate-600 sm:col-span-2">
            {selected.description}
          </p>
        ) : null}
        <FormTextarea
          label="Description"
          name="description"
          maxLength={2000}
          required
          containerClassName="sm:col-span-2"
        />
      </fieldset>
    );
  }

  if (step === "sql") {
    return selected ? (
      <Controller
        control={form.control}
        name="definition.sql"
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <h2 className="font-semibold">SQL</h2>
            <ReportSqlEditor
              readOnly={disabled}
              value={field.value}
              onChange={disabled ? () => undefined : field.onChange}
              dataset={selected}
              parameters={definition.parameters}
            />
            {fieldState.error ? (
              <p role="alert" className="text-sm text-red-700">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        )}
      />
    ) : (
      <p role="alert">Select an available dataset in Details.</p>
    );
  }

  if (step === "parameters" || step === "output") {
    return <ReportTemplateMetadataFields disabled={disabled} section={step} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Save & publish</h2>
      <p className="whitespace-pre-wrap text-sm text-slate-600">
        {description}
      </p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-slate-600">Name</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Dataset/version</dt>
          <dd>
            {selected?.name} · v{definition.datasetVersion}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">
            Parameters / output columns
          </dt>
          <dd>
            {definition.parameters.length} / {definition.columns.length}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Supported formats</dt>
          <dd>{definition.formats.join(", ")}</dd>
        </div>
      </dl>
      <p className="text-sm text-slate-600">
        Save the draft before validating or publishing a version.
      </p>
    </div>
  );
}
