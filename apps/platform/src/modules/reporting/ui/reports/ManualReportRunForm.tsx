"use client";
import { toast } from "@/shared/ui/Toast";
import { z } from "zod";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GeneralButton } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-fields";
import type { ConfiguredReport } from "../../domain/Report";
import { reportFormatSchema } from "../../domain/ReportDefinition";
import { reportParameterValuesSchema } from "../../domain/ReportParameterValues";
import { ReportParameterFields } from "../ReportParameterFields";
import { useRunReport } from "./useReports";

type Values = {
  idempotencyKey: string;
  values: Record<string, unknown>;
  format: "XLSX" | "CSV";
};
export function ManualReportRunForm({
  report,
  values,
  onQueued,
  onCancel,
}: {
  report: ConfiguredReport;
  values: Record<string, unknown>;
  onQueued: (id: string) => void;
  onCancel: () => void;
}) {
  const run = useRunReport(report.id);
  const schema = z.object({
    idempotencyKey: z.uuid(),
    values: reportParameterValuesSchema(report.definition.parameters),
    format: reportFormatSchema,
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema) as Resolver<Values>,
    defaultValues: {
      values,
      format: report.format,
      idempotencyKey: crypto.randomUUID(),
    },
  });
  async function submit(input: Values) {
    const result = await run.mutateAsync(input);
    form.setValue("idempotencyKey", crypto.randomUUID());
    toast.success("Report queued.");
    onQueued(result.id);
  }
  return (
    <FormProvider {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(
          (input) => {
            void submit(input).catch(() => undefined);
          },
          () => toast.error("Check the highlighted report parameters."),
        )}
      >
        <ReportParameterFields
          definitions={report.definition.parameters}
          disabled={run.isPending}
        />
        <FormSelect
          label="Output format"
          name="format"
          items={report.definition.formats.map((value) => ({
            value,
            label: value,
          }))}
          disabled={run.isPending}
        />
        <div className="flex flex-wrap justify-end gap-3">
          <GeneralButton
            type="button"
            variant="outline"
            disabled={run.isPending}
            onClick={onCancel}
          >
            Cancel
          </GeneralButton>
          <GeneralButton type="submit" disabled={run.isPending}>
            Run report
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
