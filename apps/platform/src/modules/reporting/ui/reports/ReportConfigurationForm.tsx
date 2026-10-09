"use client";
import { toast } from "@/shared/ui/Toast";
import { useRouter } from "next/navigation";
import {
  FormProvider,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GeneralButton } from "@/components/ui/button";
import type {
  ConfiguredReportInput,
  ConfiguredReportSaveInput,
} from "../../api/ReportManagementSchemas";
import type { ConfiguredReport } from "../../domain/Report";
import { configuredReportEditorSchema } from "../../api/ReportFormSchemas";
import { ReportParameterFields } from "../ReportParameterFields";
import { usePublishedReportTemplate } from "../definitions/useReportDefinition";
import { useSaveReport } from "./useReports";
import { ReportConfigurationMetadataFields } from "./ReportConfigurationMetadataFields";

export function ReportConfigurationForm({
  report,
  onSaved,
  onCancel,
}: {
  report?: ConfiguredReport;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const save = useSaveReport(report?.id);
  const form = useForm<
    Omit<ConfiguredReportInput, "key">,
    unknown,
    ConfiguredReportSaveInput
  >({
    resolver: (values, context, options) => {
      const schema = configuredReportEditorSchema(
        published.data?.definition,
        report?.key,
      );
      return (
        zodResolver(schema) as Resolver<
          Omit<ConfiguredReportInput, "key">,
          unknown,
          ConfiguredReportSaveInput
        >
      )(values, context, options);
    },
    defaultValues: report
      ? {
          name: report.name,
          description: report.description,
          templateId: report.templateId,
          templateVersion: report.templateVersion,
          defaults: report.defaults,
          format: report.format,
          rowVersion: report.rowVersion,
        }
      : {
          name: "",
          description: "",
          templateId: "",
          templateVersion: 1,
          defaults: { period: "explicit", values: {} },
          format: "XLSX",
        },
  });
  const templateId = useWatch({ control: form.control, name: "templateId" });
  const version = useWatch({ control: form.control, name: "templateVersion" });
  const defaults = useWatch({ control: form.control, name: "defaults" });
  const published = usePublishedReportTemplate(templateId, version);
  const definition = published.data?.definition;
  const { dirtyFields } = form.formState;
  async function submit(values: ConfiguredReportSaveInput) {
    const preserveDefaults =
      report &&
      values.templateId === report.templateId &&
      !dirtyFields.defaults;
    const saved = await save.mutateAsync({
      ...values,
      defaults: preserveDefaults ? report.defaults : values.defaults,
    });
    if (onSaved) {
      onSaved();
    } else {
      router.replace(`/admin/reports/${saved.id}`);
    }
  }
  const parameters =
    definition?.parameters.filter(
      (parameter) =>
        defaults.period === "explicit" ||
        !["startDate", "endDate"].includes(parameter.name),
    ) ?? [];
  return (
    <FormProvider {...form}>
      <div className="space-y-4">
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit(
            (values) => {
              void submit(values).catch(() => undefined);
            },
            () =>
              toast.error("Check the highlighted fields and parameter values."),
          )}
        >
          <ReportConfigurationMetadataFields
            disabled={save.isPending}
            templateId={templateId}
            version={version}
            definition={definition}
            report={report}
          >
            <ReportParameterFields
              definitions={parameters}
              prefix="defaults.values"
              disabled={save.isPending}
            />
          </ReportConfigurationMetadataFields>
          <div className="flex flex-wrap justify-end gap-3">
            {onCancel ? (
              <GeneralButton
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={onCancel}
              >
                Cancel
              </GeneralButton>
            ) : null}
            <GeneralButton
              type="submit"
              disabled={save.isPending || !definition}
            >
              Save report
            </GeneralButton>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
