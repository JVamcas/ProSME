"use client";

import { FileText, Upload } from "lucide-react";

import type { WorkflowRfiDetail } from "../../domain/runtime/WorkflowRfiView";
import { useUploadWorkflowRfiDocument } from "./WorkflowRfiHooks";

export function ApplicantWorkflowRfiDocuments({
  applicationId,
  detail,
}: {
  applicationId: string;
  detail: WorkflowRfiDetail;
}) {
  const upload = useUploadWorkflowRfiDocument(applicationId, detail.id);
  return (
    <section className="rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-brand-navy">Requested documents</h2>
      <div className="mt-4 space-y-3">
        {detail.requestedDocuments.map((document) => (
          <div
            className="rounded-lg border border-brand-navy/10 p-4"
            key={document.requirementId}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-navy">{document.name}</p>
                <p className="mt-1 text-xs text-brand-navy/60">
                  {document.acceptedFileTypes.join(", ")} · maximum{" "}
                  {document.maximumSizeMb} MB
                </p>
                {document.evidence ? (
                  <a
                    className="mt-2 inline-flex items-center text-sm font-semibold text-brand-green underline-offset-2 hover:underline"
                    href={`/api/portal/applications/${applicationId}/requests/${detail.id}/documents/${document.evidence.versionId}/download`}
                  >
                    <FileText aria-hidden="true" className="mr-1 inline size-4" />
                    {document.evidence.fileName}
                  </a>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-red-700">
                    A document is required.
                  </p>
                )}
              </div>
              {detail.status === "OPEN" ? (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-brand-orange px-4 py-2 text-sm font-semibold text-brand-orange hover:bg-brand-orange/10">
                  <Upload aria-hidden="true" className="size-4" />
                  {document.evidence ? "Replace" : "Upload"}
                  <input
                    accept={document.acceptedFileTypes.map((type) =>
                      type === "JPG" ? ".jpg,.jpeg" : `.${type.toLowerCase()}`
                    ).join(",")}
                    className="sr-only"
                    disabled={upload.isPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        upload.mutate({
                          file,
                          requirementId: document.requirementId,
                        });
                      }
                      event.target.value = "";
                    }}
                    type="file"
                  />
                </label>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {upload.isError ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {upload.error.message}
        </p>
      ) : null}
    </section>
  );
}
