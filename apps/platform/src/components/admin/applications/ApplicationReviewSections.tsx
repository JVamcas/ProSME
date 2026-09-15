import {
  Check,
  Circle,
  Clock3,
  FileText,
  ListChecks,
} from "lucide-react";

import type {
  AdminApplicationOverview,
  AdminApplicationStage,
} from "@/modules/applications/ApplicationTypes";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NA", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatMoney(value: number | null) {
  if (value === null) return "Not provided";
  return `N$${value.toLocaleString("en-NA")}`;
}

function formatPriority(value: AdminApplicationOverview["priority"]) {
  if (!value) return "Not assigned";
  return `${value.charAt(0)}${value.slice(1).toLocaleLowerCase()}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-brand-navy/8 py-3 last:border-b-0 sm:grid-cols-[minmax(8rem,.8fr)_1.2fr] sm:gap-4">
      <dt className="text-sm font-semibold text-brand-navy/55">{label}</dt>
      <dd className="text-sm font-bold text-brand-navy">{value}</dd>
    </div>
  );
}

export function ApplicationDetailsCard({
  application,
}: {
  application: AdminApplicationOverview;
}) {
  const details = [
    ["Application ID", application.reference],
    ["Opportunity", application.opportunityTitle],
    ["Submitted", formatDate(application.submittedAt)],
    ["Current stage", application.currentStageName ?? "Submitted"],
    ["Applicant", application.applicantName],
    ["Priority", formatPriority(application.priority)],
    ["Requested amount", formatMoney(application.requestedAmount)],
    ["Co-funding", formatMoney(application.coFunding)],
    ["Business type", application.businessType ?? "Not provided"],
    ["Industry", application.industry ?? "Not provided"],
    ["Location", application.location ?? "Not provided"],
  ] as const;

  return (
    <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <FileText aria-hidden="true" className="size-5 text-brand-orange" />
        <h2 className="text-lg font-bold text-brand-navy">Application Details</h2>
      </div>
      <dl className="mt-4">
        {details.map(([label, value]) => (
          <DetailRow key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}

function ProgressMarker({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-brand-green text-white">
        <Check aria-hidden="true" className="size-4" />
      </span>
    );
  }

  if (state === "active") {
    return (
      <span className="grid size-8 place-items-center rounded-full border-2 border-brand-orange bg-brand-orange/10 text-brand-orange">
        <Clock3 aria-hidden="true" className="size-4" />
      </span>
    );
  }

  return (
    <span className="grid size-8 place-items-center rounded-full border-2 border-brand-navy/15 bg-brand-white text-brand-navy/30">
      <Circle aria-hidden="true" className="size-3 fill-current" />
    </span>
  );
}

export function ApplicationProgressCard({
  application,
}: {
  application: AdminApplicationOverview;
}) {
  const submittedStage: AdminApplicationStage = {
    endedAt: application.submittedAt,
    name: "Submitted",
    startedAt: application.submittedAt,
    status: "COMPLETED",
  };
  const stages = [submittedStage, ...application.stages];

  return (
    <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-brand-navy">Progress Tracking</h2>
          <p className="mt-1 text-xs text-brand-navy/55">
            Current position in the review process
          </p>
        </div>
        <ListChecks aria-hidden="true" className="size-5 text-brand-orange" />
      </div>
      <ol aria-label="Application progress" className="mt-6">
        {stages.map((stage, index) => {
          const state = stage.status === "COMPLETED"
            ? "done"
            : stage.status === "ACTIVE" || stage.status === "BLOCKED"
              ? "active"
              : "pending";
          const isLast = index === stages.length - 1;

          return (
            <li
              className="relative flex gap-4"
              key={`${stage.name}-${index}`}
            >
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 ${
                    state === "done" ? "bg-brand-green" : "bg-brand-navy/10"
                  }`}
                />
              ) : null}
              <div className="relative z-10 shrink-0">
                <ProgressMarker state={state} />
              </div>
              <div className="min-w-0 pb-6 pt-1">
                <p className="text-sm font-bold text-brand-navy">{stage.name}</p>
                <p className="mt-1 text-xs text-brand-navy/55">
                  {state === "done"
                    ? stage.endedAt
                      ? `Completed ${formatDate(stage.endedAt)}`
                      : "Completed"
                    : state === "active"
                      ? stage.status === "BLOCKED"
                        ? "Blocked"
                        : "In progress"
                      : "Not started"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-1 rounded-xl bg-brand-cream px-4 py-3 text-xs text-brand-navy/70">
        <span className="font-bold text-brand-navy">Submitted:</span>{" "}
        {formatDate(application.submittedAt)}
      </div>
    </section>
  );
}
