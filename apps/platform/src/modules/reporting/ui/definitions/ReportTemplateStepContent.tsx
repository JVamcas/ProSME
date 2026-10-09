"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { ReactNode } from "react";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import type { ReportDataset } from "../../domain/ReportDataset";
import { ReportSqlEditor } from "./ReportSqlEditor";
import { ReportTemplateMetadataFields } from "./ReportTemplateMetadataFields";
import { ReportTemplateReviewCard } from "./ReportTemplateReviewCard";
import type {
  ReportTemplateFormValues,
  ReportTemplateStep,
} from "./useReportTemplateSteps";

export function ReportTemplateStepContent({
  step,
  datasets,
  disabled,
  reviewActions,
}: {
  step: ReportTemplateStep;
  datasets: ReportDataset[];
  disabled: boolean;
  reviewActions?: ReactNode;
}) {
  const form = useFormContext<ReportTemplateFormValues>();
  const definition = useWatch({ control: form.control, name: "definition" });
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
          infoTooltip={selected?.description}
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
    <ReportTemplateReviewCard dataset={selected} actions={reviewActions} />
  );
}
