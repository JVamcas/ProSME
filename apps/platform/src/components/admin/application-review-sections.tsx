import {
  Banknote,
  Building2,
  Check,
  FileCheck2,
  MapPin,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AdminApplication } from "@/modules/applications/application.types";
import { Detail, SectionTitle } from "./application-review-primitives";

const cardClassName =
  "rounded-xl border border-slate-200 bg-white p-6 shadow-sm";

export function ApplicationReviewDetails({
  application,
}: {
  application: AdminApplication;
}) {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="grid gap-5">
        <BusinessProfile application={application} />
        <FundingRequest application={application} />
      </div>
      <div className="grid content-start gap-5">
        <EligibilitySummary application={application} />
        <SupportingDocuments application={application} />
        <PrototypeBoundary />
      </div>
    </div>
  );
}

function BusinessProfile({ application }: { application: AdminApplication }) {
  const details = [
    ["Applicant", application.applicant, UserRound],
    ["Sector", application.sector, Building2],
    ["Region", application.region, MapPin],
    ["Current employees", String(application.employees), Users],
  ] as const;

  return (
    <section className={cardClassName}>
      <SectionTitle icon={Building2}>Business profile</SectionTitle>
      <p className="mt-5 text-sm leading-6 text-slate-600">
        {application.summary}
      </p>
      <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
        {details.map(([label, value, Icon]) => (
          <Detail icon={Icon} key={label} label={label} value={value} />
        ))}
        <Detail label="Annual turnover" value={application.turnover} />
        <Detail
          label="Namibian ownership"
          value={`${application.ownership}%`}
        />
      </dl>
    </section>
  );
}

function FundingRequest({ application }: { application: AdminApplication }) {
  return (
    <section className={cardClassName}>
      <SectionTitle icon={Banknote}>Funding request</SectionTitle>
      <div className="mt-5 rounded-xl bg-navy p-5 text-white">
        <p className="text-xs text-white/50">Amount requested</p>
        <p className="mt-1 text-3xl font-bold text-brand-yellow">
          N${application.requested.toLocaleString("en-NA")}
        </p>
      </div>
      <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">
        Proposed use
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {application.useOfFunds}
      </p>
      <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800">
        <strong>{application.jobs} new jobs</strong> expected if the proposed
        expansion is implemented.
      </p>
    </section>
  );
}

function EligibilitySummary({
  application,
}: {
  application: AdminApplication;
}) {
  const items = [
    ["Namibian ownership", `${application.ownership}% verified`],
    ["Operating history", "More than one year"],
    ["Business bank account", "Confirmation supplied"],
    ["Statutory registration", "Documents supplied"],
    ["Growth potential", "Pending technical assessment"],
  ];

  return (
    <section className={cardClassName}>
      <div className="flex items-center justify-between">
        <SectionTitle icon={FileCheck2}>Eligibility summary</SectionTitle>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
          Initial pass
        </span>
      </div>
      <ul className="mt-5 divide-y divide-slate-100">
        {items.map(([label, value]) => (
          <li className="flex gap-3 py-3" key={label}>
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="size-3" />
            </span>
            <div>
              <p className="text-xs font-bold text-slate-700">{label}</p>
              <p className="mt-1 text-[10px] text-slate-400">{value}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SupportingDocuments({
  application,
}: {
  application: AdminApplication;
}) {
  const complete = application.documents === 8;

  return (
    <section className={cardClassName}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">Supporting documents</h2>
        <strong className="text-sm text-navy">{application.documents}/8</strong>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-orange"
          style={{ width: `${(application.documents / 8) * 100}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {complete
          ? "All required document categories are represented."
          : `${8 - application.documents} document categories require attention.`}
      </p>
      <Button className="mt-5 w-full" disabled variant="outline">
        Open document register
      </Button>
    </section>
  );
}

function PrototypeBoundary() {
  return (
    <section className="rounded-xl border border-orange/20 bg-orange/5 p-5">
      <p className="text-xs font-bold text-orange">Prototype boundary</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        Assessment, information-request and decision actions remain disabled
        until roles, scoring rules and approval authority are confirmed.
      </p>
    </section>
  );
}
