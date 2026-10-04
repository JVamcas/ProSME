import type { FundingCallView } from "../api/FundingCallTransport";
import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-brand-navy/55">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-brand-navy">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

function money(value: string) {
  return `N$ ${Number(value).toLocaleString("en-NA", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

export function FundingCallReadOnlyReview({ call }: { call: FundingCallView }) {
  return (
    <section className="space-y-6 rounded-2xl border border-brand-navy/15 bg-white p-5 shadow-sm sm:p-8">
      <div>
        <h2 className="text-xl font-bold text-brand-navy">{call.title}</h2>
        <div className="mt-3 text-sm leading-6 text-brand-navy/75">
          <SanitizedRichTextContent sanitizedHtml={call.description} />
        </div>
      </div>
      <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Detail label="Reference" value={call.reference} />
        <Detail label="Funding instrument" value={call.fundingInstrument} />
        <Detail label="Thematic area" value={call.thematicArea} />
        <Detail label="Total budget" value={money(call.totalBudgetEnvelope)} />
        <Detail label="Minimum grant" value={money(call.minimumGrantAmount)} />
        <Detail label="Maximum grant" value={money(call.maximumGrantAmount)} />
        <Detail label="Opens" value={new Date(call.opensAt).toLocaleString()} />
        <Detail label="Closes" value={new Date(call.closesAt).toLocaleString()} />
        <Detail label="Application limit" value={call.applicationDuplicatePolicy} />
        <Detail
          label="New application after withdrawal"
          value={call.allowResubmissionAfterWithdrawal ? "Allowed" : "Not allowed"}
        />
        <Detail label="Application Form Version" value={call.formVersionId} />
        <Detail
          label="Eligibility Ruleset Version"
          value={call.eligibilityRuleSetVersionId}
        />
        <Detail
          label="Workflow Template Version"
          value={call.workflowTemplateVersionId}
        />
        <Detail label="Public contact" value={call.publicContactName} />
        <Detail label="Public email" value={call.publicContactEmail} />
        <Detail label="Public phone" value={call.publicContactPhone} />
      </dl>
      {call.eligibilitySummary ? (
        <div>
          <h3 className="text-sm font-bold text-brand-navy">Eligibility summary</h3>
          <SanitizedRichTextContent
            className="mt-2 text-sm leading-6 text-brand-navy/70"
            sanitizedHtml={call.eligibilitySummary}
          />
        </div>
      ) : null}
    </section>
  );
}
