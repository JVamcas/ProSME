"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import {
  useApplicationDocuments,
  useUploadApplicationDocument,
} from "@/modules/applications/ApplicationDocumentHooks";
import {
  applicationDocumentRequirements,
  applicationDocumentTypeSchema,
  type ApplicationDocumentView,
  type ApplicationDocumentType,
} from "@/modules/applications/ApplicationDocumentSchemas";
import { ApplicationDocumentRow } from "./ApplicationDocumentRow";

const uploadSchema = z.object({
  documentType: applicationDocumentTypeSchema,
  file: z.custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    { error: "Choose a file to upload" },
  ),
});
type UploadValues = z.infer<typeof uploadSchema>;

function DocumentRegister({
  documents,
  onFile,
  uploadingType,
}: {
  documents?: ApplicationDocumentView[];
  onFile: (type: ApplicationDocumentType, file?: File) => void;
  uploadingType?: ApplicationDocumentType;
}) {
  return (
    <div className="divide-y divide-brand-navy/10 rounded-xl border border-brand-navy/10">
      {applicationDocumentRequirements.map((requirement) => (
        <ApplicationDocumentRow
          disabled={Boolean(uploadingType)}
          document={documents?.find(
            (item) => item.documentType === requirement.id,
          )}
          key={requirement.id}
          onFile={(file) => onFile(requirement.id, file)}
          requirement={requirement}
          uploading={uploadingType === requirement.id}
        />
      ))}
    </div>
  );
}

export function ApplicationDocumentsForm({
  applicationId,
  onBack,
  onContinue,
  pending,
}: {
  applicationId: string;
  onBack?: () => void;
  onContinue: () => Promise<unknown>;
  pending: boolean;
}) {
  const documents = useApplicationDocuments(applicationId);
  const upload = useUploadApplicationDocument(applicationId);
  const form = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
  });

  const submitFile = (documentType: ApplicationDocumentType, file?: File) => {
    if (!file) return;
    form.setValue("documentType", documentType);
    form.setValue("file", file);
    void form.handleSubmit((input) => upload.mutateAsync(input))();
  };

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(() => onContinue())}>
        <p className="mb-5 text-sm text-brand-navy/65">
          Upload the required documents for your application.
        </p>
        <DocumentRegister
          documents={documents.data}
          onFile={submitFile}
          uploadingType={
            upload.isPending ? upload.variables?.documentType : undefined
          }
        />
        {documents.isError || upload.isError ? (
          <p className="mt-4 text-sm font-medium text-brand-navy" role="alert">
            {documents.error?.message ?? upload.error?.message}
          </p>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-brand-navy/10 pt-5">
          {onBack ? (
            <GeneralButton onClick={onBack} type="button" variant="ghost">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back
            </GeneralButton>
          ) : null}
          <GeneralButton
            disabled={pending || upload.isPending || documents.isPending}
            onClick={() => {
              void onContinue().catch(() => undefined);
            }}
            type="button"
          >
            Save and continue
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
