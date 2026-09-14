import { CheckCircle2, FileText, LoaderCircle, Upload } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  applicationDocumentRequirements,
  type ApplicationDocumentView,
} from "@/modules/applications/ApplicationDocumentSchemas";
import { formatLocalDateTime24 } from "@/lib/dateUtils";

type Requirement = (typeof applicationDocumentRequirements)[number];

function scanClassName(status: ApplicationDocumentView["scanStatus"]) {
  if (status === "clean") return "text-brand-green";
  if (status === "rejected") return "text-brand-orange";
  return "text-brand-gold";
}

function DocumentState({
  document,
  requirement,
}: {
  document?: ApplicationDocumentView;
  requirement: Requirement;
}) {
  const StateIcon = document ? CheckCircle2 : FileText;
  return (
    <div className="flex min-w-0 items-start gap-3">
      <StateIcon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-5 shrink-0",
          document ? "text-brand-green" : "text-brand-orange",
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-brand-navy">
          {requirement.label}
          {requirement.required ? (
            <span className="ml-1 text-brand-orange">*</span>
          ) : null}
        </p>
        <p className="truncate text-xs text-brand-navy/55">
          {document ? document.fileName : requirement.acceptedTypes}
        </p>
        {document ? (
          <p
            className={cn(
              "text-xs font-medium",
              scanClassName(document.scanStatus),
            )}
          >
            Uploaded at {formatLocalDateTime24(document.uploadedAt)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function acceptedExtensions(requirement: Requirement) {
  return requirement.id === "project-proposal"
    ? ".pdf,.jpg,.jpeg,.docx"
    : ".pdf,.jpg,.jpeg,.png";
}

function DocumentPicker({
  disabled,
  exists,
  onFile,
  requirement,
  uploading,
}: {
  disabled: boolean;
  exists: boolean;
  onFile: (file?: File) => void;
  requirement: Requirement;
  uploading: boolean;
}) {
  return (
    <label
      className={cn(
        buttonVariants({ size: "sm", variant: "outline" }),
        "cursor-pointer self-start sm:self-auto",
      )}
    >
      {uploading ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <Upload aria-hidden="true" className="size-4" />
      )}
      {exists ? "Replace" : "Upload"}
      <input
        accept={acceptedExtensions(requirement)}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
        type="file"
      />
    </label>
  );
}

export function ApplicationDocumentRow({
  document,
  disabled,
  onFile,
  requirement,
  uploading,
}: {
  document?: ApplicationDocumentView;
  disabled: boolean;
  onFile: (file?: File) => void;
  requirement: Requirement;
  uploading: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <DocumentState document={document} requirement={requirement} />
      <DocumentPicker
        disabled={disabled}
        exists={Boolean(document)}
        onFile={onFile}
        requirement={requirement}
        uploading={uploading}
      />
    </div>
  );
}
