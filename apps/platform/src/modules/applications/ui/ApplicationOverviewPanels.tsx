import { FileText } from "lucide-react";

import { GeneralButtonLink } from "@/components/ui/button";
import type { ApplicationDetailModel } from "./ApplicationDetailTypes";

export function ApplicationSectionSummary({
  sections,
}: {
  sections: ApplicationDetailModel["sections"];
}) {
  return (
    <section className="rounded-xl border border-brand-navy/10 bg-white p-4 shadow-sm">
      <h3 className="font-bold text-brand-navy">Section summary</h3>
      <p className="mt-1 text-xs text-brand-navy/60">
        Open a section to review the answers in this application.
      </p>
      {sections.length === 0 ? (
        <p className="mt-4 text-sm text-brand-navy/60">
          No answers have been saved yet.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-brand-navy/10 border-y border-brand-navy/10">
          {sections.map((section) => (
            <details className="group py-3" key={section.key}>
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm text-brand-navy">
                <span className="font-semibold">{section.title}</span>
                <span className="shrink-0 text-xs text-brand-navy/60">
                  {section.answers.length} {section.answers.length === 1 ? "answer" : "answers"}
                </span>
              </summary>
              <dl className="mt-3 grid gap-4 rounded-lg bg-brand-navy/[0.03] p-4 sm:grid-cols-2">
                {section.answers.map((answer) => (
                  <div key={answer.key}>
                    <dt className="text-xs text-brand-navy/60">
                      {answer.label}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-brand-navy">
                      {answer.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

export function ApplicationSubmittedDetails({
  applicantDetails,
  businessDetails,
}: Pick<ApplicationDetailModel, "applicantDetails" | "businessDetails">) {
  const groups = [
    { title: "Applicant at submission", details: applicantDetails },
    { title: "Business at submission", details: businessDetails },
  ].filter((group) => group.details.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((group) => (
        <details
          className="rounded-xl border border-brand-navy/10 bg-white p-4 shadow-sm"
          key={group.title}
        >
          <summary className="cursor-pointer font-bold text-brand-navy">
            {group.title}
          </summary>
          <dl className="mt-4 space-y-3">
            {group.details.map((detail) => (
              <div key={detail.label}>
                <dt className="text-xs text-brand-navy/60">
                  {detail.label}
                </dt>
                <dd className="break-words text-sm text-brand-navy">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
    </div>
  );
}

export function ApplicationDocumentsPanel({
  documents,
}: Pick<ApplicationDetailModel, "documents">) {
  return (
    <section
      className="rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-bold text-brand-navy">
        Supporting documents ({documents.length})
      </h2>
      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-brand-navy/60">
          No documents uploaded.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-brand-navy/10">
          {documents.map((document) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 py-3"
              key={document.key}
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText aria-hidden="true" className="size-5 shrink-0 text-brand-orange" />
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-brand-navy">
                    {document.name}
                  </p>
                  <p className="mt-1 text-xs text-brand-navy/60">
                    {document.type} · {Math.ceil(document.sizeBytes / 1024)} KB
                  </p>
                </div>
              </div>
              {document.href ? (
                <GeneralButtonLink
                  href={document.href}
                  size="compact"
                  variant="outline"
                >
                  View file
                </GeneralButtonLink>
              ) : (
                <span className="text-xs text-brand-navy/60">
                  Processing
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
