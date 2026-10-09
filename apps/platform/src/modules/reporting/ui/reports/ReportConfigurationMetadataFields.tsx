"use client";

import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import type { ConfiguredReportInput } from "../../api/ReportManagementSchemas";
import type { ConfiguredReport } from "../../domain/Report";
import { useReportTemplates } from "../definitions/useReportDefinition";
import { useReportCatalogueFilters } from "../useReportCatalogueFilters";

export function ReportConfigurationMetadataFields({
  disabled,
  templateId,
  version,
  definition,
  report,
  children,
}: {
  disabled: boolean;
  templateId: string;
  version: number;
  definition?: ConfiguredReport["definition"];
  report?: ConfiguredReport;
  children: ReactNode;
}) {
  const form = useFormContext<Omit<ConfiguredReportInput, "key">>();
  const filters = useReportCatalogueFilters();
  const templates = useReportTemplates({ ...filters.input, pageSize: 50 });

  return (
    <>
      <fieldset disabled={disabled} className="space-y-4">
        <legend className="text-base font-semibold text-brand-navy">
          Report details
        </legend>
        <p className="text-sm text-brand-navy/60">
          Changing the name or description keeps the current report version.
        </p>
        <FormInput label="Name" name="name" required />
        <FormTextarea
          label="Description"
          name="description"
          maxLength={2000}
          required
        />
      </fieldset>
      <fieldset
        disabled={disabled}
        className="space-y-4 border-t border-brand-navy/10 pt-5"
      >
        <legend className="text-base font-semibold text-brand-navy">
          Report configuration
        </legend>
        <p className="text-sm text-brand-navy/60">
          Saving changes to the report configuration creates a new report version.
        </p>
        <QuerySection
          query={templates}
          title="templates"
          loading={<Skeleton className="h-12" />}
        >
          {(data) => (
            <FormSelect
              label="Template"
              placeholder="Select a published template"
              value={templateId}
              items={[
                ...(templateId &&
                !data.items.some((item) => item.id === templateId)
                  ? [
                      {
                        value: templateId,
                        label: `Selected template · v${version}`,
                      },
                    ]
                  : []),
                ...data.items
                  .filter((item) => item.publishedVersion !== null)
                  .map((item) => ({
                    value: item.id,
                    label: `${item.name} · v${
                      item.id === report?.templateId
                        ? report.templateVersion
                        : item.publishedVersion
                    }`,
                  })),
              ]}
              onChange={(event) => {
                const selectedId = event.target.value;
                if (selectedId === templateId) {
                  return;
                }
                const selected = data.items.find(
                  (item) => item.id === selectedId,
                );
                const selectedVersion =
                  selectedId === report?.templateId
                    ? report.templateVersion
                    : (selected?.publishedVersion ?? 1);
                form.setValue("templateId", selectedId, {
                  shouldDirty: true,
                });
                form.setValue("templateVersion", selectedVersion, {
                  shouldDirty: true,
                });
                form.setValue("defaults.values", {}, { shouldDirty: true });
              }}
            />
          )}
        </QuerySection>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Default period"
            name="defaults.period"
            onChange={(event) => {
              const period = event.target
                .value as ConfiguredReportInput["defaults"]["period"];
              form.setValue("defaults.period", period, { shouldDirty: true });
              if (period !== "explicit") {
                const values = { ...form.getValues("defaults.values") };
                delete values.startDate;
                delete values.endDate;
                form.setValue("defaults.values", values, {
                  shouldDirty: true,
                });
              }
            }}
            items={[
              {
                value: "explicit",
                label: "Explicit values / current snapshot",
              },
              { value: "previous-month", label: "Previous complete month" },
              {
                value: "website-completed",
                label: "Website collection start through yesterday",
              },
            ]}
          />
          <FormSelect
            label="Default format"
            name="format"
            items={(definition?.formats ?? ["XLSX", "CSV"]).map((value) => ({
              value,
              label: value,
            }))}
          />
        </div>
        {children}
      </fieldset>
    </>
  );
}
