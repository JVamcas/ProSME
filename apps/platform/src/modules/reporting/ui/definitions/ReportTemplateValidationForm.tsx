"use client";
import { toast } from "@/shared/ui/Toast";
import { z } from "zod";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GeneralButton } from "@/components/ui/button";
import type { ReportTemplate } from "../../domain/ReportDefinition";
import { reportParameterValuesSchema } from "../../domain/ReportParameterValues";
import { ReportParameterFields } from "../ReportParameterFields";
import { useValidateReportTemplate } from "./useReportDefinition";
import { reportParameterDefaultValues } from "./ReportParameterPresentation";

type Values = { values: Record<string, unknown> };
export function ReportTemplateValidationForm({
  template,
  canPublish,
  disabled,
}: {
  template: ReportTemplate;
  canPublish: boolean;
  disabled: boolean;
}) {
  const validation = useValidateReportTemplate(template.id, false);
  const publication = useValidateReportTemplate(template.id, true);
  const schema = z.object({
    values: reportParameterValuesSchema(template.definition.parameters),
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema) as Resolver<Values>,
    defaultValues: {
      values: reportParameterDefaultValues(template.definition.parameters),
    },
  });
  const busy = disabled || validation.isPending || publication.isPending;
  return (
    <FormProvider {...form}>
      <form
        className="space-y-4 rounded border p-4"
        onSubmit={form.handleSubmit(
          (values) =>
            validation.mutate({ ...values, rowVersion: template.rowVersion }),
          () => toast.error("Check the highlighted validation parameters."),
        )}
      >
        <h2 className="font-semibold">Validate saved draft</h2>
        <ReportParameterFields
          definitions={template.definition.parameters}
          disabled={busy}
        />
        {disabled ? (
          <p>Save your changes before validating or publishing.</p>
        ) : null}
        <div className="flex gap-2">
          <GeneralButton type="submit" variant="outline" disabled={busy}>
            Validate
          </GeneralButton>
          {canPublish ? (
            <GeneralButton
              type="button"
              disabled={busy}
              onClick={form.handleSubmit(
                (values) =>
                  publication.mutate({
                    ...values,
                    rowVersion: template.rowVersion,
                  }),
                () =>
                  toast.error("Check the highlighted publication parameters."),
              )}
            >
              Publish version
            </GeneralButton>
          ) : null}
        </div>
        {validation.isSuccess ? (
          <p role="status">SQL and output types validated.</p>
        ) : null}
        {publication.isSuccess ? (
          <p role="status">An immutable version was published.</p>
        ) : null}
      </form>
    </FormProvider>
  );
}
