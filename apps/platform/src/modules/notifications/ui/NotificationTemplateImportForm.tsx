"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import { FileUploadButton } from "@/shared/ui/FileUploadButton";
import { useImportNotificationTemplate } from "./NotificationTemplateHooks";

const importFormSchema = z.object({
  file: z.custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    "Select an HTML template file.",
  ),
  plainTextTemplate: z.string().max(262_144),
  subjectTemplate: z.string().trim().min(1).max(500).refine(
    (value) => !/[\r\n]/.test(value),
    "The subject cannot contain newlines.",
  ),
});

type ImportFormValues = z.infer<typeof importFormSchema>;

export function NotificationTemplateImportForm({
  channelCode,
  targetId,
}: {
  channelCode: string;
  targetId: string;
}) {
  const mutation = useImportNotificationTemplate(channelCode, targetId);
  const form = useForm<ImportFormValues>({
    defaultValues: { plainTextTemplate: "", subjectTemplate: "" },
    resolver: zodResolver(importFormSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await mutation.mutateAsync(values);
      toast.success(`Draft version ${result.version.versionNumber} imported.`);
      form.reset({ plainTextTemplate: "", subjectTemplate: "" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to import template.",
      );
    }
  });

  return (
    <FormProvider {...form}>
      <form
        className="space-y-4 rounded-2xl border border-brand-navy/10 bg-white p-5"
        onSubmit={submit}
      >
        <h2 className="text-lg font-bold text-brand-navy">Import a draft</h2>
        <Controller
          control={form.control}
          name="file"
          render={({ field: { onChange, value } }) => (
            <FormField
              error={form.formState.errors.file?.message}
              label="HTML template"
              required
            >
              <FileUploadButton
                accept=".html,text/html"
                disabled={mutation.isPending}
                label={value?.name ?? "Select HTML template"}
                onFile={onChange}
              />
            </FormField>
          )}
        />
        <FormInput label="Subject" name="subjectTemplate" required />
        <GeneralButton disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Validating…" : "Import draft"}
        </GeneralButton>
      </form>
    </FormProvider>
  );
}
