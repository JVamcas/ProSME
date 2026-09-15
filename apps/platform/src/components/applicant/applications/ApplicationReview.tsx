"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Cloud } from "lucide-react";
import {
  FormProvider,
  useForm,
  useWatch,
  type UseFormRegister,
} from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/form-controls";
import { formatMoneyValue } from "@/components/ui/money-field";
import { useApplicationDocuments } from "@/modules/applications/ApplicationDocumentHooks";
import { applicationDeclarationItems } from "@/modules/applications/ApplicationDeclarations";
import type { ApplicationSection } from "@/modules/applications/ApplicationSchemas";
import type { ApplicationView } from "@/modules/applications/ApplicationTypes";
import { useBusiness } from "@/modules/businesses/BusinessHooks";

const reviewConfirmationSchema = z.object({
  reviewed: z.boolean(),
});

type ReviewConfirmation = z.infer<typeof reviewConfirmationSchema>;

type ReviewItem = {
  label: string;
  section: ApplicationSection;
  summary: string;
};

function ReviewRow({ item, onEdit }: {
  item: ReviewItem;
  onEdit: (section: ApplicationSection) => void;
}) {
  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
      <span className="flex items-center gap-3 font-semibold text-brand-navy">
        <CheckCircle2
          aria-hidden="true"
          className="size-5 shrink-0 text-brand-green"
        />
        {item.label}
      </span>
      <span className="text-sm text-brand-navy/70">{item.summary}</span>
      <GeneralButton
        onClick={() => onEdit(item.section)}
        size="sm"
        type="button"
        variant="ghost"
      >
        Edit
      </GeneralButton>
    </li>
  );
}

function declarationSummary(application: ApplicationView) {
  const accepted = applicationDeclarationItems.filter(
    (item) => application.declarationsSection[item.id],
  ).length;
  return accepted === applicationDeclarationItems.length
    ? "All declarations accepted"
    : `${accepted} of ${applicationDeclarationItems.length} accepted`;
}

function useReviewItems(application: ApplicationView): ReviewItem[] {
  const business = useBusiness(application.businessSection.businessId);
  const documents = useApplicationDocuments(application.id);
  return [
    {
      label: "Business information",
      section: "business",
      summary: business.data?.legalName ?? "Selected business",
    },
    {
      label: "Project details",
      section: "project",
      summary: application.projectSection.projectTitle ?? "Not provided",
    },
    {
      label: "Financial information",
      section: "financial",
      summary: `N$ ${formatMoneyValue(application.financialSection.amountRequested)} requested`,
    },
    {
      label: "Supporting documents",
      section: "documents",
      summary: `${documents.data?.length ?? 0} documents uploaded`,
    },
    {
      label: "Declarations",
      section: "declarations",
      summary: declarationSummary(application),
    },
  ];
}

function ReviewConfirmationField({
  register,
}: {
  register: UseFormRegister<ReviewConfirmation>;
}) {
  return (
    <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-brand-navy">
      <Checkbox className="mt-0.5 size-5" {...register("reviewed")} />
      <span>
        I confirm that I have reviewed my application and it is ready for
        submission.
        <span aria-hidden="true" className="ml-1 text-brand-orange">*</span>
      </span>
    </label>
  );
}

function ReviewActions({ onBack, pending, reviewed }: {
  onBack: () => void;
  pending: boolean;
  reviewed: boolean;
}) {
  return (
    <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-brand-navy/10 pt-5">
      <span className="flex items-center gap-2 text-xs text-brand-navy/60">
        <Cloud aria-hidden="true" className="size-4 text-brand-orange" />
        Draft saved
      </span>
      <div className="flex flex-wrap gap-3">
        <GeneralButton onClick={onBack} type="button" variant="ghost">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back
        </GeneralButton>
        <GeneralButton disabled={!reviewed || pending} type="submit">
          {pending ? "Submitting…" : "Submit application"}
        </GeneralButton>
      </div>
    </div>
  );
}

export function ApplicationReview({
  application,
  onBack,
  onEdit,
  onSubmit,
  pending = false,
}: {
  application: ApplicationView;
  onBack: () => void;
  onEdit: (section: ApplicationSection) => void;
  onSubmit?: () => Promise<unknown>;
  pending?: boolean;
}) {
  const form = useForm<ReviewConfirmation>({
    defaultValues: { reviewed: false },
    resolver: zodResolver(reviewConfirmationSchema),
  });
  const reviewed = useWatch({ control: form.control, name: "reviewed" });
  const items = useReviewItems(application);

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(async () => {
          await onSubmit?.();
        })}
      >
        <p className="mb-5 text-sm text-brand-navy/65">
          Please review your application before submitting.
        </p>
        <ul className="divide-y divide-brand-navy/10 rounded-xl border border-brand-navy/10">
          {items.map((item) => (
            <ReviewRow item={item} key={item.section} onEdit={onEdit} />
          ))}
        </ul>
        <ReviewConfirmationField register={form.register} />
        <ReviewActions onBack={onBack} pending={pending} reviewed={reviewed} />
      </form>
    </FormProvider>
  );
}
