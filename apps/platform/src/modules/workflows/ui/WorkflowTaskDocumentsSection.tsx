"use client";

import { workflowDocumentExtensions } from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";

import { CheckCircle2, Download, FileText } from "lucide-react";

import { GeneralButtonAnchor } from "@/components/ui/button";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { DocumentRequirementItem } from "@/modules/work-queue/TaskTypes";
import { FileUploadButton } from "@/shared/ui/FileUploadButton";

type Props = {
  disabled: boolean;
  preview?: boolean;
  taskId?: string;
  requirements: DocumentRequirementItem[];
  upload?: {
    error?: string;
    onFile: (requirementId: string, file: File) => void;
    pendingRequirementId?: string;
    taskId: string;
  };
};

export function WorkflowTaskDocumentsSection({
  disabled,
  preview = false,
  taskId,
  requirements,
  upload,
}: Props) {
  return (
    <div className="space-y-4">
      {requirements.map((requirement) => {
        const document = requirement.document;
        const downloadTaskId = taskId ?? upload?.taskId;
        const canUpload =
          requirement.uploader !== "APPLICANT" &&
          (preview || Boolean(requirement.id && upload));
        const StateIcon = document ? CheckCircle2 : FileText;
        const accept = (
          requirement.acceptedExtensions ??
          requirement.acceptedFileTypes.flatMap(
            (type) => workflowDocumentExtensions[type],
          )
        ).join(",");
        return (
          <section
            className="flex flex-col gap-3 rounded-xl border border-brand-navy/10 p-4 sm:flex-row sm:items-center sm:justify-between"
            key={requirement.name}
          >
            <div className="flex items-start gap-3">
              <StateIcon
                className={
                  document
                    ? "mt-0.5 size-5 shrink-0 text-brand-green"
                    : "mt-0.5 size-5 shrink-0 text-brand-orange"
                }
              />
              <div>
                <p className="text-sm font-semibold text-brand-navy">
                  {requirement.name}
                  {requirement.mandatory ? (
                    <span className="ml-1 text-brand-orange">*</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-brand-navy/55">
                  {requirement.acceptedFileTypes.join(", ")} · Maximum{" "}
                  {requirement.maximumSizeMb} MB
                  {requirement.maxPages
                    ? ` · Maximum ${requirement.maxPages} pages`
                    : ""}
                </p>
                {requirement.uploader === "APPLICANT" && !document ? (
                  <p className="mt-1 text-xs font-medium text-brand-navy/70">
                    To be submitted by the applicant
                  </p>
                ) : null}
                {document ? (
                  <p className="mt-1 text-xs font-medium text-brand-navy/75">
                    {document.fileName} -{" "}
                    {formatLocalDateTime24(document.uploadedAt)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {document && downloadTaskId ? (
                <GeneralButtonAnchor
                  download
                  href={`/api/admin/tasks/${downloadTaskId}/documents/${document.versionId}/download`}
                  size="sm"
                  variant="ghost"
                >
                  <Download aria-hidden="true" className="size-4" />
                  Download
                </GeneralButtonAnchor>
              ) : null}
              {canUpload ? (
                <FileUploadButton
                  accept={accept}
                  disabled={
                    preview || disabled || Boolean(upload?.pendingRequirementId)
                  }
                  label={document ? "Upload new version" : "Upload file"}
                  onFile={(file) => {
                    if (!preview && requirement.id) {
                      upload?.onFile(requirement.id, file);
                    }
                  }}
                  uploading={Boolean(
                    requirement.id &&
                    upload?.pendingRequirementId === requirement.id,
                  )}
                  variant="compact"
                />
              ) : null}
            </div>
          </section>
        );
      })}
      {upload?.error ? (
        <p className="text-sm text-red-700" role="alert">
          {upload.error}
        </p>
      ) : null}
    </div>
  );
}
