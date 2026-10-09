"use client";

import { Controller, useFormContext } from "react-hook-form";
import { FormSelect } from "@/components/ui/form-fields";
import type { ReportTemplateInput } from "../../api/ReportManagementSchemas";
import { ReportOutputColumnTable } from "./ReportOutputColumnTable";
import { ReportParameterTable } from "./ReportParameterTable";

export function ReportTemplateMetadataFields({
  disabled,
  section,
}: {
  disabled: boolean;
  section: "parameters" | "output";
}) {
  const { control, formState } = useFormContext<ReportTemplateInput>();
  const error =
    section === "parameters"
      ? formState.errors.definition?.parameters
      : formState.errors.definition?.columns;
  const errorMessage = error?.message ?? error?.root?.message;
  return (
    <div className="space-y-6">
      {section === "parameters" ? (
        <ReportParameterTable disabled={disabled} />
      ) : (
        <>
          <ReportOutputColumnTable disabled={disabled} />
          <Controller
            control={control}
            name="definition.formats"
            render={({ field }) => (
              <FormSelect
                label="Supported formats"
                name="definition.formats"
                multiple
                value={field.value}
                disabled={disabled}
                items={[
                  { value: "XLSX", label: "Excel (.xlsx)" },
                  { value: "CSV", label: "CSV" },
                ]}
                onMultipleChange={field.onChange}
              />
            )}
          />
        </>
      )}
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
