"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ShieldCheck, UserRound } from "lucide-react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import {
  FieldError,
  Label,
  Select,
  Textarea,
} from "@/shared/ui/FormPrimitives";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import type { WorkflowCoiReviewDetail } from "../../api/WorkflowCoiReviewTypes";
import { workflowCoiReviewDecisionSchema } from "../../api/WorkflowCoiReviewSchemas";
import {
  useDecideWorkflowCoiReview,
  useWorkflowCoiReview,
} from "./useWorkflowCoiReviews";

type DecisionValues = z.input<typeof workflowCoiReviewDecisionSchema>;

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-navy/50">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-brand-navy">{value}</dd>
    </div>
  );
}

function ReviewDetails({ review }: { review: WorkflowCoiReviewDetail }) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-navy/10 bg-brand-cream/40 p-5">
        <h3 className="flex items-center gap-2 font-bold text-brand-navy">
          <UserRound aria-hidden="true" className="size-5 text-brand-orange" />
          Assignment context
        </h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <DetailItem label="Reviewer" value={review.assignedUserName} />
          <DetailItem
            label="Role"
            value={review.assignedRoleName ?? "Not specified"}
          />
          <DetailItem label="Task" value={review.taskName} />
          <DetailItem label="Stage" value={review.stageName} />
          <DetailItem label="Application" value={review.applicationReference} />
          <DetailItem
            label="Applicant"
            value={review.businessName ?? review.applicantName}
          />
          <DetailItem
            label="Disclosed"
            value={formatLocalDateTime24(review.submittedAt)}
          />
        </dl>
      </section>
      <section>
        <h3 className="font-bold text-brand-navy">Conflict disclosure</h3>
        <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-brand-navy">
          {review.disclosureText}
        </p>
      </section>
    </div>
  );
}

function DecisionForm({
  onReviewed,
  review,
}: {
  onReviewed: () => void;
  review: WorkflowCoiReviewDetail;
}) {
  const mutation = useDecideWorkflowCoiReview(review.taskId);
  const form = useForm<DecisionValues>({
    defaultValues: {
      decision: "CLEAR",
      expectedRowVersion: review.rowVersion,
      reason: "",
      replacementUserId: undefined,
    },
    resolver: zodResolver(workflowCoiReviewDecisionSchema),
  });
  const decision = useWatch({
    control: form.control,
    name: "decision",
  });

  async function submit(values: DecisionValues) {
    await mutation.mutateAsync(values);
    onReviewed();
  }

  return (
    <FormProvider {...form}>
      <form
        className="mt-7 space-y-5 border-t border-brand-navy/10 pt-6"
        id="conflict-review-decision"
        onSubmit={form.handleSubmit(submit)}
      >
        <fieldset>
          <legend className="text-sm font-bold text-brand-navy">
            Decision
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer gap-3 rounded-xl border border-brand-navy/15 p-4 has-[:checked]:border-brand-orange has-[:checked]:bg-brand-orange/5">
              <input
                className="mt-1 accent-brand-orange"
                type="radio"
                value="CLEAR"
                {...form.register("decision")}
              />
              <span>
                <span className="block text-sm font-semibold text-brand-navy">
                  Clear conflict
                </span>
                <span className="mt-1 block text-xs leading-5 text-brand-navy/60">
                  Allow the assigned reviewer to continue.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-brand-navy/15 p-4 has-[:checked]:border-brand-orange has-[:checked]:bg-brand-orange/5">
              <input
                className="mt-1 accent-brand-orange"
                type="radio"
                value="RECUSE"
                {...form.register("decision")}
              />
              <span>
                <span className="block text-sm font-semibold text-brand-navy">
                  Recuse reviewer
                </span>
                <span className="mt-1 block text-xs leading-5 text-brand-navy/60">
                  Remove the reviewer and assign an eligible replacement.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {decision === "RECUSE" ? (
          <div>
            <Label htmlFor="replacement-reviewer">Replacement reviewer</Label>
            <Select
              aria-invalid={Boolean(form.formState.errors.replacementUserId)}
              id="replacement-reviewer"
              {...form.register("replacementUserId")}
            >
              <option value="">Select an eligible reviewer</option>
              {review.replacementCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.displayName}
                </option>
              ))}
            </Select>
            <FieldError
              message={form.formState.errors.replacementUserId?.message}
            />
            {!review.replacementCandidates.length ? (
              <p className="mt-2 flex gap-2 text-sm text-amber-700">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4" />
                No eligible replacement reviewer is currently available.
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <Label htmlFor="review-reason">Decision reason</Label>
          <Textarea
            aria-invalid={Boolean(form.formState.errors.reason)}
            id="review-reason"
            placeholder="Explain the basis for this decision"
            {...form.register("reason")}
          />
          <FieldError message={form.formState.errors.reason?.message} />
        </div>

        {mutation.isError ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {mutation.error.message}
          </p>
        ) : null}
      </form>
    </FormProvider>
  );
}

export function WorkflowCoiReviewDrawer({
  onClose,
  onReviewed,
  taskId,
}: {
  onClose: () => void;
  onReviewed: () => void;
  taskId: string | null;
}) {
  const review = useWorkflowCoiReview(taskId);
  const detail = review.data;

  return (
    <RightDrawer
      description="Review the disclosure independently before the assigned reviewer can continue."
      footer={
        detail ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <GeneralButton onClick={onClose} type="button" variant="outline">
              Cancel
            </GeneralButton>
            <GeneralButton form="conflict-review-decision" type="submit">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Submit decision
            </GeneralButton>
          </div>
        ) : undefined
      }
      onClose={onClose}
      open={Boolean(taskId)}
      size="xl"
      title="Conflict review"
    >
      {review.isPending ? (
        <p className="text-sm text-brand-navy/65">Loading review details…</p>
      ) : review.isError ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {review.error.message}
        </p>
      ) : detail ? (
        <>
          <ReviewDetails review={detail} />
          <DecisionForm
            key={detail.taskId}
            onReviewed={onReviewed}
            review={detail}
          />
        </>
      ) : null}
    </RightDrawer>
  );
}
