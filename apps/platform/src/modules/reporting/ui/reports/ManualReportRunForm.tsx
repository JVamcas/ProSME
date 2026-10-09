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
}: {
  report: ConfiguredReport;
  values: Record<string, unknown>;
  onQueued: (id: string) => void;
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
    onQueued(result.id);
  }
  return (
    <FormProvider {...form}>
      <form
        className="space-y-4 rounded border p-4"
        onSubmit={form.handleSubmit(
          (input) => {
            void submit(input).catch(() => undefined);
          },
          () => toast.error("Check the highlighted report parameters."),
        )}
      >
        <h2 className="font-semibold">Run report</h2>
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
        <GeneralButton type="submit" disabled={run.isPending}>
          Run report
        </GeneralButton>
        {run.isSuccess ? (
          <p role="status">Report queued. View its progress in Runs.</p>
        ) : null}
      </form>
    </FormProvider>
  );
}
