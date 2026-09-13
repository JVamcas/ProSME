import { AlertCircle, ArrowLeft, Check, LockKeyhole } from "lucide-react";
import Link from "next/link";

import type { AdminApplication } from "@/modules/applications/ApplicationTypes";
import { StatusBadge } from "./StatusBadge";

const workflow = [
  "Submitted",
  "Completeness",
  "Technical assessment",
  "Finance review",
  "Decision",
];

const stageIndex: Record<string, number> = {
  Submitted: 0,
  "Completeness Check": 1,
  "More Information": 1,
  "Technical Assessment": 2,
  "Finance Review": 3,
  Approved: 4,
  Declined: 4,
};

export function ApplicationReviewHeader({
  application,
}: {
  application: AdminApplication;
}) {
  const submitted = new Intl.DateTimeFormat("en-NA", {
    dateStyle: "medium",
  }).format(new Date(application.submitted));

  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <div>
        <Link
          href="/admin#applications"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-navy"
        >
          <ArrowLeft className="size-4 text-brand-orange" />
          Back to applications
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-navy">
            {application.business}
          </h1>
          <StatusBadge status={application.status} />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {application.id} · Submitted {submitted}
        </p>
      </div>
      <span className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <LockKeyhole className="size-3 text-brand-orange" />
        Read-only prototype
      </span>
    </div>
  );
}

export function ApplicationWorkflow({ status }: { status: string }) {
  const activeStage = stageIndex[status] ?? 0;

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-navy">Application workflow</h2>
          <p className="mt-1 text-xs text-slate-400">
            Current position in the review process
          </p>
        </div>
        <AlertCircle className="size-5 text-brand-gold" />
      </div>
      <div className="mt-7 grid gap-0 md:grid-cols-5">
        {workflow.map((title, index) => (
          <WorkflowStage
            active={index === activeStage}
            done={index < activeStage}
            final={index === workflow.length - 1}
            key={title}
            title={title}
          />
        ))}
      </div>
    </section>
  );
}

function WorkflowStage({
  active,
  done,
  final,
  title,
}: {
  active: boolean;
  done: boolean;
  final: boolean;
  title: string;
}) {
  const marker = done
    ? "border-green bg-green text-white"
    : active
      ? "border-orange bg-white text-navy"
      : "border-slate-200 bg-white text-slate-300";

  return (
    <div className="relative flex gap-4 pb-6 md:block md:pb-0">
      <span
        className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 ${marker}`}
      >
        {done ? (
          <Check className="size-4" />
        ) : (
          <span className="size-2 rounded-full bg-current" />
        )}
      </span>
      {!final && (
        <span
          className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 md:left-8 md:top-[15px] md:h-0.5 md:w-[calc(100%-2rem)] ${done ? "bg-green" : "bg-slate-200"}`}
        />
      )}
      <p
        className={`text-xs font-bold md:mt-3 ${active ? "text-navy" : "text-slate-500"}`}
      >
        {title}
      </p>
    </div>
  );
}
