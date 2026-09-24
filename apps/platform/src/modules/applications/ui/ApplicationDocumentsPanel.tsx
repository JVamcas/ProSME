"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Download, FileText, LoaderCircle, Upload } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButtonLink, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import {
  applicationDocumentUploadSchema,
  type ApplicationDocumentRegister,
  type ApplicationDocumentRequirement,
  type ApplicationDocumentView,
} from "../api/ApplicationDocumentSchemas";
import {
  useApplicationDocuments,
  useUploadApplicationDocument,
} from "./useApplicationDocuments";

type UploadValues = z.infer<typeof applicationDocumentUploadSchema>;

function statusText(document?: ApplicationDocumentView) {
  if (!document) return "Not uploaded";
  if (document.storageStatus === "failed") return "Upload finalization failed";
  if (document.storageStatus === "abandoned") return "Upload expired";
  if (document.storageStatus === "finalized") return "Uploaded";
  return "Finalizing upload";
}

function RequirementRow({
  applicationId,
  document,
  disabled,
  onFile,
  requirement,
  uploading,
}: {
  applicationId: string;
  document?: ApplicationDocumentView;
  disabled: boolean;
  onFile: (file?: File) => void;
  requirement: ApplicationDocumentRequirement;
  uploading: boolean;
}) {
  const finalized = document?.storageStatus === "finalized";
  const StateIcon = finalized ? CheckCircle2 : FileText;
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <StateIcon
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-5 shrink-0",
            finalized ? "text-brand-green" : "text-brand-orange",
          )}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-navy">
            {requirement.label}
            {requirement.required ? <span className="ml-1 text-brand-orange">*</span> : null}
          </p>
          <p className="truncate text-xs text-brand-navy/60">
            {document?.fileName ?? `${requirement.acceptedExtensions.join(", ")} · maximum 10 MB`}
          </p>
          <p className="text-xs font-medium text-brand-navy/75">
            {statusText(document)}
            {document ? ` · ${formatLocalDateTime24(document.uploadedAt)}` : ""}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {finalized && document ? (
          <GeneralButtonLink
            href={`/api/portal/applications/${applicationId}/documents/${document.versionId}/download`}
            size="sm"
            variant="ghost"
          >
            <Download aria-hidden="true" className="size-4" />
            Download
          </GeneralButtonLink>
        ) : null}
        <label
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            disabled && "pointer-events-none opacity-50",
            "cursor-pointer",
          )}
        >
          {uploading ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Upload aria-hidden="true" className="size-4" />
          )}
          {document ? "Upload new version" : "Upload"}
          <input
            accept={requirement.acceptedExtensions.join(",")}
            className="sr-only"
            disabled={disabled}
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </div>
    </div>
  );
}

export function ApplicationDocumentRegisterPanel({
  applicationId,
  readOnly = false,
  register,
}: {
  applicationId: string;
  readOnly?: boolean;
  register: ApplicationDocumentRegister;
}) {
  const upload = useUploadApplicationDocument(applicationId);
  const form = useForm<UploadValues>({
    resolver: zodResolver(applicationDocumentUploadSchema),
  });
  const submitFile = (requirementKey: string, file?: File) => {
    if (!file) return;
    form.setValue("requirementKey", requirementKey);
    form.setValue("file", file);
    void form.handleSubmit((input) => upload.mutateAsync(input))();
  };
  if (register.requirements.length === 0) return null;
  return (
    <FormProvider {...form}>
      <section
        aria-labelledby="application-documents-heading"
        className="space-y-4"
      >
        <div>
          <h2
            className="text-lg font-bold text-brand-navy"
            id="application-documents-heading"
          >
            Supporting documents
          </h2>
          <p className="text-sm text-brand-navy/65">
            Files count after their uploads finish successfully.
          </p>
        </div>
        <form
          className="divide-y divide-brand-navy/10 rounded-xl border border-brand-navy/10"
          noValidate
          onSubmit={form.handleSubmit((input) => upload.mutateAsync(input))}
        >
          {register.requirements.map((requirement) => (
            <RequirementRow
              applicationId={applicationId}
              disabled={readOnly || upload.isPending}
              document={register.documents.find(
                (item) => item.requirementKey === requirement.key,
              )}
              key={requirement.key}
              onFile={(file) => submitFile(requirement.key, file)}
              requirement={requirement}
              uploading={
                upload.isPending
                && upload.variables?.requirementKey === requirement.key
              }
            />
          ))}
        </form>
        {upload.isError ? (
          <p className="text-sm text-red-700" role="alert">
            {upload.error.message}
          </p>
        ) : null}
      </section>
    </FormProvider>
  );
}

export function ApplicationDocumentsPanel({
  applicationId,
}: {
  applicationId: string;
}) {
  const register = useApplicationDocuments(applicationId);
  if (register.isPending) {
    return (
      <p className="text-sm text-brand-navy/65">
        Loading document requirements…
      </p>
    );
  }
  if (register.isError || !register.data) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {register.error?.message}
      </p>
    );
  }
  return (
    <ApplicationDocumentRegisterPanel
      applicationId={applicationId}
      register={register.data}
    />
  );
}
