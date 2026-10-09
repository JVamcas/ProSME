"use client";
import { toast } from "@/shared/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageShell } from "@/shared/ui/PageShell";
import { GeneralButton } from "@/components/ui/button";
import { StepProgress } from "@/components/ui/step-progress";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { ReportTemplateInput } from "../../api/ReportManagementSchemas";
import { reportTemplateFormSchema } from "../../api/ReportFormSchemas";
import type { ReportTemplate } from "../../domain/ReportDefinition";
import type { ReportDataset } from "../../domain/ReportDataset";
import { ReportTemplateStepContent } from "./ReportTemplateStepContent";
import {
  reportTemplateSteps,
  useReportTemplateSteps,
} from "./useReportTemplateSteps";
import { ReportTemplateActions } from "./ReportTemplateActions";
import {
  useReportDatasets,
  useReportTemplate,
  useSaveReportTemplate,
} from "./useReportDefinition";

export function ReportTemplateEditor({
  id,
  permissions,
}: {
  id?: string;
  permissions: string[];
}) {
  const datasets = useReportDatasets();
  const template = useReportTemplate(id);
  return (
    <QuerySection
      query={datasets}
      title="datasets"
      loading={<Skeleton className="h-96" />}
    >
      {(data) =>
        id ? (
          <QuerySection
            query={template}
            title="template"
            loading={<Skeleton className="h-96" />}
          >
            {(saved) => (
              <ReportTemplateForm
                key={saved.id}
                datasets={data}
                template={saved}
                permissions={permissions}
              />
            )}
          </QuerySection>
        ) : (
          <ReportTemplateForm datasets={data} permissions={permissions} />
        )
      }
    </QuerySection>
  );
}
function ReportTemplateForm({
  datasets,
  template,
  permissions,
}: {
  datasets: ReportDataset[];
  template?: ReportTemplate;
  permissions: string[];
}) {
  const router = useRouter();
  const formId = useId();
  const save = useSaveReportTemplate(template?.id);
  const granted = new Set(permissions);
  const canEdit = granted.has(
    template
      ? permissionCodes.reportingTemplateUpdateAll
      : permissionCodes.reportingTemplateCreateAll,
  );
  const canPublish = granted.has(permissionCodes.reportingTemplatePublishAll);
  const initial = datasets[0];
  const schema = reportTemplateFormSchema(template?.key);
  const form = useForm<
    Omit<ReportTemplateInput, "key">,
    unknown,
    ReportTemplateInput
  >({
    resolver: zodResolver(schema) as Resolver<
      Omit<ReportTemplateInput, "key">,
      unknown,
      ReportTemplateInput
    >,
    defaultValues: template
      ? {
          name: template.name,
          description: template.description,
          rowVersion: template.rowVersion,
          definition: template.definition,
        }
      : {
          name: "",
          description: "",
          definition: {
            datasetKey: initial?.key,
            datasetVersion: initial?.version,
            sql: "",
            parameters: [],
            columns: [],
            formats: ["XLSX", "CSV"],
          },
        },
  });
  const steps = useReportTemplateSteps(form);
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description,
        definition: template.definition,
        rowVersion: template.rowVersion,
      });
    }
  }, [form, template]);
  const busy = !canEdit || save.isPending;
  async function submit(values: ReportTemplateInput) {
    const saved = await save.mutateAsync(values);
    form.reset({
      name: saved.name,
      description: saved.description,
      definition: saved.definition,
      rowVersion: saved.rowVersion,
    });
    if (!template) {
      router.replace(`/admin/reports/templates-definitions/${saved.id}`);
    }
  }
  return (
    <PageShell
      title={template ? template.name : "Create report template"}
      backLink={
        <Link href="/admin/reports/templates-definitions">Report Definition</Link>
      }
    >
      <FormProvider {...form}>
        <form
          className="space-y-6"
          id={formId}
          onSubmit={(event) => {
            event.preventDefault();
            if (steps.currentStep !== "review" || !canEdit || save.isPending) {
              return;
            }
            void form.handleSubmit(
              (values) => {
                void submit(values).catch(() => undefined);
              },
              (errors) => {
                steps.showInvalidStep(errors);
                toast.error(
                  "Check the highlighted fields and parameter values.",
                );
              },
            )(event);
          }}
        >
          <StepProgress
            ariaLabel="Report template configuration"
            className="border-b border-brand-navy/10 pb-5"
            currentStepId={steps.currentStep}
            completedStepIds={steps.completedSteps}
            disabled={save.isPending}
            hideLabelsOnMobile
            onStepChange={steps.changeStep}
            steps={reportTemplateSteps.map((step, index) => ({
              ...step,
              disabled:
                index > steps.currentIndex + 1 &&
                !steps.completedSteps.includes(step.id),
            }))}
          />
          <div className="min-h-96 py-4">
            <ReportTemplateStepContent
              step={steps.currentStep}
              datasets={datasets}
              disabled={busy}
              reviewActions={
                <ReportTemplateActions
                  canEdit={canEdit}
                  canPublish={canPublish}
                  canValidate={granted.has(
                    permissionCodes.reportingTemplateReadAll,
                  )}
                  disabled={save.isPending}
                  formId={formId}
                  isDirty={form.formState.isDirty}
                  template={template}
                />
              }
            />
          </div>
        </form>
        <div className="mt-6 flex justify-between gap-3 border-t border-brand-navy/10 pt-4">
          <GeneralButton
            type="button"
            variant="outline"
            disabled={steps.currentIndex === 0 || save.isPending}
            onClick={() => void steps.back()}
          >
            Back
          </GeneralButton>
          {steps.currentStep !== "review" ? (
            <GeneralButton
              key="continue"
              type="button"
              disabled={save.isPending}
              onClick={() => void steps.next()}
            >
              Continue
            </GeneralButton>
          ) : null}
        </div>
      </FormProvider>
    </PageShell>
  );
}
