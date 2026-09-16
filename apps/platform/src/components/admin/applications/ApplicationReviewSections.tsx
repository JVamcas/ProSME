import {
  Check,
  Circle,
  Clock3,
  ListChecks,
} from "lucide-react";

import type {
  AdminApplicationOverview,
  AdminApplicationStage,
} from "@/modules/applications/ApplicationTypes";
import { formatLocalDateTime24 } from "@/lib/dateUtils";


function formatMoney(value: number | null) {
  if (value === null) return "Not provided";

  return `N$ ${value.toLocaleString("en-NA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPriority(value: AdminApplicationOverview["priority"]) {
  if (!value) return "Not assigned";

  return `${value.charAt(0)}${value.slice(1).toLowerCase()}`;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] items-start gap-x-4 py-1.5">
      <dt className="text-sm font-semibold text-brand-navy/55">
        {label}
      </dt>

      <dd className="min-w-0 text-sm font-semibold leading-5 text-brand-navy">
        {children}
      </dd>
    </div>
  );
}

export function ApplicationDetailsCard({
  application,
}: {
  application: AdminApplicationOverview;
}) {
  return (
    <section className="rounded-xl border border-brand-navy/10 bg-white px-5 py-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
      <h2 className="mb-4 text-base font-bold text-brand-navy">
        Application Details
      </h2>

      <dl>
        <DetailRow label="Application ID">
          {application.reference}
        </DetailRow>

        <DetailRow label="Opportunity">
          {application.opportunityTitle}
        </DetailRow>

        <DetailRow label="Submitted">
          {formatLocalDateTime24(application.submittedAt)}
        </DetailRow>

        <DetailRow label="Current Stage">
          {application.currentStageName ?? "Submitted"}
        </DetailRow>

        <DetailRow label="Applicant">
          {application.applicantName}
        </DetailRow>

        <DetailRow label="Priority">
          {application.priority ? (
            <span className="inline-flex rounded-md bg-brand-orange/15 px-2.5 py-1 text-xs font-bold text-brand-orange">
              {formatPriority(application.priority)}
            </span>
          ) : (
            <span className="text-brand-navy/50">
              Not assigned
            </span>
          )}
        </DetailRow>

        <DetailRow label="Requested Amount">
          {formatMoney(application.requestedAmount)}
        </DetailRow>

        <DetailRow label="Co-funding">
          {formatMoney(application.coFunding)}
        </DetailRow>

        <DetailRow label="Business Type">
          {application.businessType ?? "Not provided"}
        </DetailRow>

        <DetailRow label="Industry">
          {application.industry ?? "Not provided"}
        </DetailRow>

        <DetailRow label="Location">
          {application.location ?? "Not provided"}
        </DetailRow>
      </dl>
    </section>
  );
}

function ProgressMarker({
  state,
}: {
  state: "done" | "active" | "pending";
}) {
  if (state === "done") {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-brand-green text-white shadow-sm">
        <Check aria-hidden="true" className="size-4" />
      </span>
    );
  }

  if (state === "active") {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-brand-orange text-white shadow-sm">
        <Circle
          aria-hidden="true"
          className="size-3 fill-current"
        />
      </span>
    );
  }

  return (
    <span className="grid size-8 place-items-center rounded-full border border-brand-navy/10 bg-brand-navy/5 text-brand-navy/35">
      <Circle
        aria-hidden="true"
        className="size-2.5 fill-current"
      />
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
    <section className="rounded-xl border border-brand-navy/10 bg-white px-5 py-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
      <h2 className="text-base font-bold text-brand-navy">
        Progress Tracking
      </h2>

      <ol
        aria-label="Application progress"
        className="mt-6"
      >
        {stages.map((stage, index) => {
          const state =
            stage.status === "COMPLETED"
              ? "done"
              : stage.status === "ACTIVE" ||
                  stage.status === "BLOCKED"
                ? "active"
                : "pending";

          const isLast = index === stages.length - 1;

          return (
            <li
              key={`${stage.name}-${index}`}
              className="relative grid grid-cols-[32px_1fr] gap-x-5"
            >
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={[
                    "absolute left-[15px] top-8 h-[calc(100%-0.25rem)] w-[2px]",
                    state === "done"
                      ? "bg-brand-green"
                      : state === "active"
                        ? "bg-brand-orange/35"
                        : "bg-brand-navy/10",
                  ].join(" ")}
                />
              )}

              <div className="relative z-10">
                <ProgressMarker state={state} />
              </div>

              <div className="pb-6">
                <p
                  className={[
                    "text-sm font-semibold leading-5",
                    state === "pending"
                      ? "text-brand-navy/35"
                      : "text-brand-navy",
                  ].join(" ")}
                >
                  {stage.name}
                </p>

                {state === "done" && (
                  <p className="mt-0.5 text-xs text-brand-navy/55">
                    {formatLocalDateTime24(stage.endedAt ?? stage.startedAt)}
                  </p>
                )}

                {state === "active" && (
                  <p className="mt-0.5 text-xs text-brand-navy/55">
                    {stage.startedAt
                      ? formatLocalDateTime24(stage.startedAt)
                      : "In progress"}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}