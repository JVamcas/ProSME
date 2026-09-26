"use client";

import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  ClipboardCheck,
  FileCheck2,
  LockKeyhole,
  Scale,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import {
  FormRenderer,
  type DynamicFormValues,
} from "@/modules/forms/ui/renderer/FormRenderer";
import { PageShell } from "@/shared/ui/PageShell";

import type { WorkflowTaskCoiGate as CoiGate } from "../../ClientWorkflowCoiService";
import { useDeclareWorkflowCoi } from "./useWorkflowCoi";

function BackToWorkQueue() {
  return (
    <Link
      className="inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-brand-navy transition-colors hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
      href="/admin/work-queue"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back to work queue
    </Link>
  );
}

function DeclarationPageShell({
  children,
  statusLabel = "Declaration required",
  taskName,
}: {
  children: ReactNode;
  statusLabel?: string;
  taskName: string;
}) {
  return (
    <PageShell
      actions={(
        <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-brand-orange/10 px-4 text-xs font-semibold text-brand-orange sm:text-sm">
          <LockKeyhole aria-hidden="true" className="size-4" />
          {statusLabel}
        </span>
      )}
      backLink={<BackToWorkQueue />}
      description="Declare any potential conflict before viewing the application."
      eyebrow="Assigned review"
      icon={<ShieldCheck aria-hidden="true" />}
      title={taskName}
      variant="contained"
    >
      {children}
    </PageShell>
  );
}

function GuidanceItem({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-navy ring-1 ring-brand-navy/5 [&_svg]:size-5">
        {icon}
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block text-sm font-semibold text-brand-navy">
          {title}
        </span>
        <span className="mt-0.5 block text-sm leading-5 text-brand-navy/65">
          {children}
        </span>
      </span>
    </li>
  );
}

function DeclarationGuidance() {
  return (
    <aside className="rounded-2xl border border-brand-gold/20 bg-brand-cream/70 p-5 sm:p-6">
      <h2 className="flex items-center gap-3 text-lg font-bold text-brand-navy">
        <ShieldCheck aria-hidden="true" className="size-6" />
        Why this is required
      </h2>
      <ul className="mt-6 space-y-6">
        <GuidanceItem
          icon={<Scale aria-hidden="true" />}
          title="Independent review"
        >
          Helps ensure a fair and impartial assessment process.
        </GuidanceItem>
        <GuidanceItem
          icon={<LockKeyhole aria-hidden="true" />}
          title="Confidential handling"
        >
          Keeps application information secure until you are cleared to view it.
        </GuidanceItem>
        <GuidanceItem
          icon={<FileCheck2 aria-hidden="true" />}
          title="Auditable decision"
        >
          Records your declaration for accountability and compliance.
        </GuidanceItem>
      </ul>
      <div className="mt-6 flex gap-3 border-t border-brand-navy/10 pt-5 text-sm leading-5 text-brand-navy/65">
        <CircleHelp
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-brand-navy"
        />
        <p>Need help? Contact the programme administrator.</p>
      </div>
    </aside>
  );
}

function GateStatus({ gate }: { gate: CoiGate }) {
  const pending = gate.state === "PENDING_REVIEW";

  return (
    <DeclarationPageShell
      statusLabel={pending ? "Review pending" : "Assignment unavailable"}
      taskName={gate.taskName}
    >
      <section
        className="mx-auto max-w-3xl rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-sm sm:p-8"
        role="status"
      >
        <span className="flex size-12 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
          {pending ? (
            <ClipboardCheck aria-hidden="true" className="size-6" />
          ) : (
            <LockKeyhole aria-hidden="true" className="size-6" />
          )}
        </span>
        <h2 className="mt-5 text-xl font-bold text-brand-navy sm:text-2xl">
          {pending
            ? "Conflict disclosure pending review"
            : "Assignment unavailable"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-brand-navy/65 sm:text-base">
          {pending
            ? "An independent reviewer must decide before you can access this task."
            : "This assignment is no longer available."}
        </p>
      </section>
    </DeclarationPageShell>
  );
}

function DeclarationForm({ gate }: { gate: CoiGate }) {
  const mutation = useDeclareWorkflowCoi(gate.taskId);
  const [values, setValues] = useState<DynamicFormValues>({});

  function submit(formValues: DynamicFormValues) {
    const hasConflict = formValues.HAS_CONFLICT === true;
    const disclosure = formValues.DISCLOSURE_TEXT;
    void mutation.mutateAsync({
      decision: hasConflict ? "DISCLOSE" : "NO_CONFLICT",
      disclosureText:
        hasConflict && typeof disclosure === "string"
          ? disclosure.trim()
          : undefined,
      expectedRowVersion: gate.rowVersion,
    });
  }

  return (
    <DeclarationPageShell taskName={gate.taskName}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <section className="rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl">
            Conflict of interest declaration
          </h2>
          <p className="mt-2 text-sm leading-6 text-brand-navy/65 sm:text-base">
            Your declaration helps protect the integrity and independence of the review process.
          </p>
          <div className="mt-5 flex gap-3 rounded-xl bg-brand-blue/15 p-4 text-sm leading-5 text-brand-navy">
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-blue-700"
            />
            <p>
              Application details remain hidden until your declaration is accepted.
            </p>
          </div>

          <div className="mt-5 [&_[role=radiogroup]]:grid [&_[role=radiogroup]]:grid-cols-1 [&_[role=radiogroup]]:gap-3 [&_[role=radiogroup]>label]:min-h-14 [&_[role=radiogroup]>label]:rounded-xl [&_[role=radiogroup]>label]:border [&_[role=radiogroup]>label]:border-brand-navy/15 [&_[role=radiogroup]>label]:p-4">
            <FormRenderer
              definition={gate.form}
              formData={values}
              onChange={setValues}
              onSubmit={submit}
              showCompleteness={false}
            >
              {mutation.isError ? (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  role="alert"
                >
                  {mutation.error.message}
                </p>
              ) : null}
              <div className="mt-5 flex flex-col gap-4 border-t border-brand-navy/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-brand-navy/55 sm:max-w-xs">
                  You can&apos;t change this declaration after submission.
                </p>
                <GeneralButton
                  className="w-full sm:w-auto"
                  disabled={mutation.isPending}
                  size="lg"
                  type="submit"
                >
                  {mutation.isPending ? "Submitting…" : gate.form.submitLabel}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </GeneralButton>
              </div>
            </FormRenderer>
          </div>
        </section>

        <DeclarationGuidance />
      </div>
    </DeclarationPageShell>
  );
}

export function WorkflowTaskCoiGate({ gate }: { gate: CoiGate }) {
  if (
    gate.state === "PENDING_REVIEW" ||
    gate.state === "RECUSED" ||
    gate.state === "REVOKED"
  ) {
    return <GateStatus gate={gate} />;
  }

  return <DeclarationForm gate={gate} />;
}
