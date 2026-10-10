import { Badge } from "@/shared/ui/Badge";
import type {
  KnowledgeIssue,
  KnowledgeRecord,
} from "../../domain/ChatbotKnowledge";

const factLabels: Record<string, string> = {
  reference: "Reference",
  lifecycle: "Publication status",
  opensAt: "Opens at",
  closesAt: "Closes at",
  minimumGrantAmount: "Minimum funding amount",
  maximumGrantAmount: "Maximum funding amount",
  totalBudgetEnvelope: "Total funding envelope",
  fundingInstrument: "Funding instrument",
  thematicArea: "Thematic area",
  publicContactName: "Public contact",
  publicContactEmail: "Public email",
  publicContactPhone: "Public phone",
  failureType: "Failure severity",
  disclaimer: "Advisory notice",
};
const severityLabels: Record<string, string> = {
  HARD_FAIL: "Mandatory",
  SOFT_FAIL: "Review required",
  WARNING: "Advisory",
};

export function KnowledgePassage({
  record,
  issues = [],
}: {
  record: KnowledgeRecord;
  issues?: KnowledgeIssue[];
}) {
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-brand-navy">{record.title}</h3>
      {record.facts.failureType ? (
        <Badge variant="outline">
          {severityLabels[String(record.facts.failureType)]}
        </Badge>
      ) : null}
      <a
        className="text-sm text-brand-orange underline"
        href={record.source.url}
      >
        {record.source.label}
      </a>
      <p className="whitespace-pre-wrap text-sm leading-7">{record.text}</p>
      {Object.keys(record.facts).length ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(record.facts).map(([key, value]) => (
            <div key={key}>
              <dt className="font-semibold">{factLabels[key] ?? key}</dt>
              <dd>
                {value === null ? "Not specified by the source" : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {issues.map((issue, index) => (
        <p
          key={index}
          role="alert"
          className="border-l-2 border-red-500 pl-3 text-sm text-red-700"
        >
          {issue.message}
        </p>
      ))}
    </article>
  );
}
