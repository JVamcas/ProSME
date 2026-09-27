"use client";

import { CheckCircle2, Download, FileText } from "lucide-react";

import { GeneralButtonLink } from "@/components/ui/button";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { DocumentRequirementItem } from "@/modules/work-queue/TaskTypes";
import { FileUploadButton } from "@/shared/ui/FileUploadButton";

const acceptedExtensions = {
  DOCX: [".docx"],
  JPG: [".jpg", ".jpeg"],
  PDF: [".pdf"],
  PNG: [".png"],
} as const;

type Props = {
  disabled: boolean;
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
  requirements,
  upload,
}: Props) {
  return (
    <div className="space-y-4">
      {requirements.map((requirement) => {
        const document = requirement.document;
        const canUpload = requirement.uploader !== "APPLICANT"
          && Boolean(requirement.id && upload);
        const StateIcon = document ? CheckCircle2 : FileText;
        const accept = requirement.acceptedFileTypes.flatMap(
          (type) => acceptedExtensions[type],
        ).join(",");
        return (
          <section
            className="flex flex-col gap-3 rounded-xl border border-brand-navy/10 p-4 sm:flex-row sm:items-center sm:justify-between"
            key={requirement.name}
          >
            <div className="flex items-start gap-3">
              <StateIcon
                className={document
                  ? "mt-0.5 size-5 shrink-0 text-brand-green"
                  : "mt-0.5 size-5 shrink-0 text-brand-orange"}
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
                </p>
                {document ? (
                  <p className="mt-1 text-xs font-medium text-brand-navy/75">
                    {document.fileName} -{" "}
                    {formatLocalDateTime24(document.uploadedAt)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {document && upload ? (
                <GeneralButtonLink
                  href={"/api/admin/tasks/" + upload.taskId
                    + "/documents/" + document.versionId + "/download"}
                  size="sm"
                  variant="ghost"
                >
                  <Download aria-hidden="true" className="size-4" />
                  Download
                </GeneralButtonLink>
              ) : null}
              {canUpload && requirement.id ? (
                <FileUploadButton
                  accept={accept}
                  disabled={disabled || Boolean(upload?.pendingRequirementId)}
                  label={document ? "Upload new version" : "Upload file"}
                  onFile={(file) => upload?.onFile(requirement.id!, file)}
                  uploading={upload?.pendingRequirementId === requirement.id}
                  variant="compact"
                />
              ) : null}
            </div>
          </section>
        );
      })}
      {upload?.error ? (
        <p className="text-sm text-red-700" role="alert">{upload.error}</p>
      ) : null}
    </div>
  );
}
