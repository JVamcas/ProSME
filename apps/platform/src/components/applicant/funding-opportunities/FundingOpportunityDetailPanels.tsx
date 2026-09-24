import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileDown,
  Mail,
} from "lucide-react";
import Link from "next/link";

import { GeneralButton } from "@/components/ui/button";
import type { PublicFundingCallDetail } from "@/modules/funding-calls/api/PublicFundingCallTransport";
import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";
import {
  formatOpportunityAmount,
  formatOpportunityDate,
} from "./FundingOpportunityFormat";
import { FundingOpportunityReadinessCard } from "./FundingOpportunityReadinessCard";

const panelClass =
  "rounded-2xl border border-brand-navy/15 bg-brand-white p-6 shadow-sm";

export function OverviewPanel({
  opportunity,
}: {
  opportunity: PublicFundingCallDetail;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className={panelClass}>
        <h2 className="text-xl font-bold text-brand-navy">
          About this opportunity
        </h2>
        <SanitizedRichTextContent
          className="mt-3"
          sanitizedHtml={opportunity.description}
        />
        {opportunity.eligibilitySummary ? (
          <div className="mt-6 border-t border-brand-navy/10 pt-5">
            <h3 className="font-bold text-brand-navy">Eligibility summary</h3>
            <p className="mt-2 text-sm leading-6 text-brand-navy/70">
              {opportunity.eligibilitySummary}
            </p>
          </div>
        ) : null}
        <ul className="mt-6 grid gap-4 text-sm text-brand-navy">
          <Highlight text={formatOpportunityAmount(opportunity)} />
          <Highlight
            text={`Applications open ${formatOpportunityDate(opportunity.opensAt)}`}
          />
          <Highlight
            text={`Applications close ${formatOpportunityDate(opportunity.closesAt)}`}
          />
        </ul>
      </article>
      <div className="grid content-start gap-4">
        <FundingOpportunityReadinessCard opportunity={opportunity} />
        <DeadlineCard opportunity={opportunity} />
      </div>
    </div>
  );
}

function Highlight({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-brand-green"
      />
      {text}
    </li>
  );
}

function DeadlineCard({
  opportunity,
}: {
  opportunity: PublicFundingCallDetail;
}) {
  const upcoming = opportunity.status === "upcoming";
  const label = upcoming ? "Applications open" : "Application deadline";
  const date = upcoming ? opportunity.opensAt : opportunity.closesAt;

  return (
    <aside className="rounded-2xl border border-brand-blue/30 bg-brand-cream/50 p-5">
      <p className="text-sm font-bold text-brand-navy">{label}</p>
      <p className="mt-1 text-sm text-brand-navy/70">
        {formatOpportunityDate(date)}
      </p>
    </aside>
  );
}

export function KeyInformationPanel({
  opportunity,
}: {
  opportunity: PublicFundingCallDetail;
}) {
  return (
    <article className={panelClass}>
      <h2 className="text-xl font-bold text-brand-navy">Key information</h2>
      <dl className="mt-5 grid gap-5 text-sm text-brand-navy sm:grid-cols-2">
        <Information icon={Banknote} label="Funding amount">
          {formatOpportunityAmount(opportunity)}
        </Information>
        <Information icon={CalendarDays} label="Application period">
          {formatOpportunityDate(opportunity.opensAt)} –{" "}
          {formatOpportunityDate(opportunity.closesAt)}
        </Information>
      </dl>
    </article>
  );
}

function Information({
  children,
  icon: Icon,
  label,
}: {
  children: React.ReactNode;
  icon: typeof Banknote;
  label: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon aria-hidden="true" className="size-5 text-brand-orange" />
      <div>
        <dt className="font-semibold">{label}</dt>
        <dd className="mt-1 text-brand-navy/70">{children}</dd>
      </div>
    </div>
  );
}

export function DocumentsPanel({
  opportunity,
}: {
  opportunity: PublicFundingCallDetail;
}) {
  return (
    <article className={panelClass}>
      <FileDown aria-hidden="true" className="size-7 text-brand-orange" />
      <h2 className="mt-4 text-xl font-bold text-brand-navy">Documents</h2>
      {opportunity.publicDocuments.length ? (
        <ul className="mt-4 grid gap-3">
          {opportunity.publicDocuments.map((document) => (
            <li key={document.url}>
              <a
                className="font-semibold text-brand-navy underline"
                href={document.url}
              >
                {document.label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-brand-navy/70">
          No guidance documents have been published for this opportunity.
        </p>
      )}
    </article>
  );
}

export function ContactPanel({
  opportunity,
}: {
  opportunity: PublicFundingCallDetail;
}) {
  const contact = opportunity.publicContact;
  return (
    <article className={panelClass}>
      <Mail aria-hidden="true" className="size-7 text-brand-orange" />
      <h2 className="mt-4 text-xl font-bold text-brand-navy">Need help?</h2>
      <p className="mt-2 text-sm leading-6 text-brand-navy/70">
        {contact.name ?? "Contact the SME Fund team"} if you need clarification
        about this call.
      </p>
      {contact.email ? (
        <GeneralButton asChild className="mt-5" variant="outline">
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </GeneralButton>
      ) : (
        <GeneralButton asChild className="mt-5" variant="outline">
          <Link href="/contact">Contact us</Link>
        </GeneralButton>
      )}
      {contact.phone ? (
        <p className="mt-3 text-sm text-brand-navy/70">{contact.phone}</p>
      ) : null}
    </article>
  );
}
