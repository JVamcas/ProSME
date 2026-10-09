"use client";
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
}: {
  disabled: boolean;
  templateId: string;
  version: number;
  definition?: ConfiguredReport["definition"];
}) {
  const form = useFormContext<Omit<ConfiguredReportInput, "key">>();
  const filters = useReportCatalogueFilters();
  const templates = useReportTemplates({ ...filters.input, pageSize: 50 });
  return (
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
      <FormInput label="Name" name="name" />
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
                  label: `${item.name} · v${item.publishedVersion}`,
                })),
            ]}
            onChange={(event) => {
              const selected = data.items.find(
                (item) => item.id === event.target.value,
              );
              form.setValue("templateId", event.target.value, {
                shouldDirty: true,
              });
              form.setValue(
                "templateVersion",
                selected?.publishedVersion ?? 1,
                { shouldDirty: true },
              );
              form.setValue("defaults.values", {}, { shouldDirty: true });
            }}
          />
        )}
      </QuerySection>
      <FormTextarea
        label="Description"
        name="description"
        maxLength={2000}
        required
        containerClassName="sm:col-span-2"
      />
      <FormInput
        label="Published template version"
        name="templateVersion"
        type="number"
        min={1}
        registrationOptions={{ valueAsNumber: true }}
      />
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
    </fieldset>
  );
}
