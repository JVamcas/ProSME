"use client";

import { CheckCircle2, Download, FileText } from "lucide-react";
import { useEffect } from "react";

import { GeneralButtonAnchor } from "@/components/ui/button";
import { FileUploadButton } from "@/shared/ui/FileUploadButton";
import { toast } from "@/shared/ui/Toast";
import type { WorkflowRfiDetail } from "../../domain/runtime/WorkflowRfiView";
import { useUploadWorkflowRfiDocument } from "./WorkflowRfiHooks";

const acceptedExtensions = {
  DOCX: [".docx"],
  JPG: [".jpg", ".jpeg"],
  PDF: [".pdf"],
  PNG: [".png"],
} as const;

export function ApplicantWorkflowRfiDocuments({
  applicationId,
  detail,
}: {
  applicationId: string;
  detail: WorkflowRfiDetail;
}) {
  const upload = useUploadWorkflowRfiDocument(applicationId, detail.id);

  useEffect(() => {
    if (upload.error) toast.error(upload.error.message);
  }, [upload.error]);

  return (
    <section className="rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-brand-navy">Requested documents</h2>
      <div className="mt-4 space-y-3">
        {detail.requestedDocuments.map((document) => {
          const StateIcon = document.evidence ? CheckCircle2 : FileText;
          const accept = document.acceptedFileTypes
            .flatMap((type) => acceptedExtensions[type])
            .join(",");
          const uploading =
            upload.isPending &&
            upload.variables?.requirementId === document.requirementId;

          return (
            <div
              className="flex flex-col gap-3 rounded-lg border border-brand-navy/10 p-4 sm:flex-row sm:items-center sm:justify-between"
              key={document.requirementId}
            >
              <div className="flex min-w-0 items-start gap-3">
                <StateIcon
                  aria-hidden="true"
                  className={
                    document.evidence
                      ? "mt-0.5 size-5 shrink-0 text-brand-green"
                      : "mt-0.5 size-5 shrink-0 text-brand-orange"
                  }
                />
                <div className="min-w-0">
                  <p className="font-semibold text-brand-navy">
                    {document.name}
                  </p>
                  <p className="mt-1 text-xs text-brand-navy/60">
                    {document.acceptedFileTypes.join(", ")} · maximum{" "}
                    {document.maximumSizeMb} MB
                  </p>
                  <p
                    className={
                      document.evidence
                        ? "mt-1 truncate text-xs font-medium text-brand-navy/75"
                        : "mt-1 text-xs font-semibold text-red-700"
                    }
                  >
                    {document.evidence
                      ? document.evidence.fileName
                      : "A document is required."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {document.evidence ? (
                  <GeneralButtonAnchor
                    download
                    href={`/api/portal/applications/${applicationId}/requests/${detail.id}/documents/${document.evidence.versionId}/download`}
                    size="sm"
                    variant="ghost"
                  >
                    <Download aria-hidden="true" className="size-4" />
                    Download
                  </GeneralButtonAnchor>
                ) : null}
                {detail.status === "OPEN" ? (
                  <FileUploadButton
                    accept={accept}
                    disabled={upload.isPending}
                    label={document.evidence ? "Upload new version" : "Upload"}
                    onFile={(file) =>
                      upload.mutate({
                        file,
                        requirementId: document.requirementId,
                      })
                    }
                    uploading={uploading}
                    variant="compact"
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
