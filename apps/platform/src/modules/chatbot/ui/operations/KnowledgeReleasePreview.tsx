"use client";
import { GeneralButton } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import type {
  KnowledgeChange,
  KnowledgeRelease,
} from "../../domain/ChatbotKnowledge";
import { KnowledgePassage } from "./KnowledgePassage";
import { useApproveChatbotKnowledge } from "./useChatbotKnowledge";

const sections = [
  { kind: "funding-call", label: "Funding calls" },
  { kind: "eligibility-criterion", label: "Grouped eligibility guidance" },
  { kind: "faq", label: "Questions and answers" },
] as const;

export function KnowledgeReleasePreview({
  release,
  changes,
  canApprove,
  active = false,
  withdrawn = false,
}: {
  release: KnowledgeRelease;
  changes: KnowledgeChange[];
  canApprove: boolean;
  active?: boolean;
  withdrawn?: boolean;
}) {
  const approval = useApproveChatbotKnowledge();
  const orphanIssues = release.snapshot.issues.filter(
    (issue) =>
      !release.snapshot.records.some((record) => record.id === issue.recordId),
  );
  let statusLabel = "Prepared for review";
  if (release.status === "APPROVED")
    statusLabel = "Approved, awaiting publication";
  if (active) statusLabel = "Active approved knowledge";
  if (withdrawn) statusLabel = "Withdrawn";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">Exact knowledge preview</h2>
        <Badge variant={release.status === "APPROVED" ? "success" : "outline"}>
          {statusLabel}
        </Badge>
      </div>
      <p className="text-sm text-slate-600">
        Prepared {new Date(release.preparedAt).toLocaleString()}. Review the
        passages, source links and changes before approving this content.
      </p>
      {release.snapshot.issues.length ? (
        <p role="alert">
          Approval is blocked by {release.snapshot.issues.length} source issues.
          Correct the sources and prepare a replacement.
        </p>
      ) : null}
      {orphanIssues.map((issue, index) => (
        <p
          key={index}
          role="alert"
          className="border-l-2 border-red-500 pl-3 text-red-700"
        >
          {issue.message}
        </p>
      ))}
      {sections.map((section) => {
        const records = release.snapshot.records.filter(
          (record) => record.kind === section.kind,
        );
        if (!records.length) return null;
        return (
          <section
            key={section.kind}
            className="space-y-3"
            aria-label={section.label}
          >
            <h2 className="text-lg font-semibold">{section.label}</h2>
            {records.map((record) => (
              <KnowledgePassage
                key={record.id}
                record={record}
                issues={release.snapshot.issues.filter(
                  (issue) => issue.recordId === record.id,
                )}
              />
            ))}
          </section>
        );
      })}
      <section className="space-y-3" aria-label="Changes from active knowledge">
        <h2 className="text-lg font-semibold">Changes from active knowledge</h2>
        {!changes.length ? <p>No changes to the active passages.</p> : null}
        {changes.map((change) => {
          const record = change.after ?? change.before;
          if (!record) return null;
          return (
            <details
              key={record.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <summary className="cursor-pointer font-semibold">
                {change.kind}: {record.title}
              </summary>
              {change.before ? (
                <div className="mt-3">
                  <p className="mb-2 font-semibold">
                    Previously active passage
                  </p>
                  <KnowledgePassage record={change.before} />
                </div>
              ) : null}
              {change.after ? (
                <div className="mt-3">
                  <p className="mb-2 font-semibold">Prepared passage</p>
                  <KnowledgePassage record={change.after} />
                </div>
              ) : null}
            </details>
          );
        })}
      </section>
      {canApprove && release.status === "PREPARED" ? (
        <GeneralButton
          disabled={
            Boolean(release.snapshot.issues.length) || approval.isPending
          }
          onClick={() =>
            void approval.mutateAsync(release).catch(() => undefined)
          }
        >
          {approval.isPending
            ? "Checking sources and approving…"
            : "Approve exact knowledge content"}
        </GeneralButton>
      ) : null}
    </div>
  );
}
