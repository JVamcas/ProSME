"use client";

import { FileText, Info } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/shared/ui/Badge";
import type { ReportDataset } from "../../domain/ReportDataset";
import type { ReportTemplateFormValues } from "./useReportTemplateSteps";

export function ReportTemplateReviewCard({
  dataset,
  actions,
}: {
  dataset?: ReportDataset;
  actions?: ReactNode;
}) {
  const headingId = useId();
  const { control } = useFormContext<ReportTemplateFormValues>();
  const [name, description, definition] = useWatch({
    control,
    name: ["name", "description", "definition"],
  });

  return (
    <section aria-labelledby={headingId} className="card overflow-hidden">
      <div className="space-y-6 p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <FileText aria-hidden="true" className="size-6" />
            </div>
            <h2
              id={headingId}
              className="text-lg font-semibold text-brand-navy sm:text-xl"
            >
              Save &amp; publish
            </h2>
          </div>
          <Badge variant="subtle">Draft</Badge>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-brand-navy/65">
          {description}
        </p>
        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <dt className="text-sm text-brand-navy/60">Name</dt>
            <dd className="break-words font-medium text-brand-navy">
              {name}
            </dd>
          </div>
          <div className="min-w-0 space-y-2">
            <dt className="text-sm text-brand-navy/60">Dataset / version</dt>
            <dd className="flex flex-wrap items-center gap-2 font-medium text-brand-navy">
              <span className="min-w-0 break-words">{dataset?.name}</span>
              <Badge variant="outline" className="rounded-md">
                v{definition.datasetVersion}
              </Badge>
            </dd>
          </div>
          <div className="space-y-2">
            <dt className="text-sm text-brand-navy/60">
              Parameters / output columns
            </dt>
            <dd className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-md">
                {definition.parameters.length}{" "}
                {definition.parameters.length === 1 ? "parameter" : "parameters"}
              </Badge>
              <Badge variant="outline" className="rounded-md">
                {definition.columns.length}{" "}
                {definition.columns.length === 1 ? "column" : "columns"}
              </Badge>
            </dd>
          </div>
          <div className="space-y-2">
            <dt className="text-sm text-brand-navy/60">Supported formats</dt>
            <dd className="flex flex-wrap gap-2">
              {definition.formats.map((format) => (
                <Badge key={format} variant="outline" className="rounded-md">
                  {format}
                </Badge>
              ))}
            </dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-col gap-4 border-t border-brand-navy/10 bg-brand-cream/40 px-5 py-4 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
        <p className="flex items-start gap-2 text-sm leading-6 text-brand-navy/65">
          <Info
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-brand-orange"
          />
          <span>Save the draft before validating or publishing a version.</span>
        </p>
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
