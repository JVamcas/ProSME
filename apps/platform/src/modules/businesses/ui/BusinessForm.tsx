"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { StepProgress } from "@/shared/ui/StepProgress";
import { GeneralButton } from "@/components/ui/button";
import { BusinessMembersTable } from "./BusinessMembersTable";
import { BusinessProfileFields } from "./BusinessProfileFields";
import { ProfileFormActions } from "@/components/applicant/profile/ProfileFormActions";
import {
  useBusiness,
  useCreateBusiness,
  useUpdateBusiness,
} from "@/modules/businesses/BusinessHooks";
import {
  businessProfileSchema,
  type BusinessProfileInput,
} from "@/modules/businesses/BusinessSchemas";
import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { businessSectorFormValues } from "../domain/BusinessSectors";

const defaults: BusinessProfileInput = {
  applicantPosition: "",
  members: [],
  businessType: "",
  employeeCount: "",
  establishedYear: "",
  legalName: "",
  physicalAddress: "",
  region: "",
  registrationNumber: "",
  sector: "",
  sectorOther: "",
  secondarySector: "",
  secondarySectorOther: "",
  tradingName: "",
};

type BusinessFormProps = {
  businessId?: string;
  initialValues?: BusinessProfileInput;
  onSuccess?: () => void;
  variant?: "card" | "dialog";
};

export function BusinessForm({
  businessId,
  initialValues,
  onSuccess,
  variant = "card",
}: BusinessFormProps) {
  const [step, setStep] = useState<"details" | "members">("details");
  const router = useRouter();
  const business = useBusiness(businessId);
  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness(businessId ?? "new");
  const form = useForm<BusinessProfileInput>({
    defaultValues: initialValues
      ? businessSectorFormValues(initialValues)
      : defaults,
    mode: "onChange",
    resolver: zodResolver(businessProfileSchema),
  });

  useEffect(() => {
    if (business.data) {
      form.reset(businessSectorFormValues(business.data));
    }
  }, [business.data, form]);

  if (businessId && !initialValues && business.isPending)
    return (
      <PortalLoadingState
        title="Loading business"
        description="Just a moment..."
      />
    );
  if (businessId && (business.isError || !business.data)) {
    return (
      <PortalErrorState
        onAction={() => void business.refetch()}
        actionLabel="Retry"
        title="Error"
        description="There was an error loading the business. Please check your connection and try again."
      />
    );
  }

  const mutation = businessId ? updateBusiness : createBusiness;
  async function changeStep(next: "details" | "members") {
    if (next === "details") {
      setStep(next);
      return;
    }
    const detailFields = Object.keys(defaults).filter(
      (key) => key !== "members",
    ) as (keyof BusinessProfileInput)[];
    if (await form.trigger(detailFields, { shouldFocus: true })) setStep(next);
  }

  const submit = form.handleSubmit(
    async (input) => {
      try {
        await mutation.mutateAsync(input);
      } catch {
        return;
      }
      toast.success(businessId ? "Business updated" : "Business added");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/portal/businesses");
      }
    },
    (errors) => {
      setStep(
        Object.keys(errors).some((key) => key !== "members")
          ? "details"
          : "members",
      );
    },
  );

  return (
    <FormProvider {...form}>
      <form
        className={
          variant === "card"
            ? "mt-6 rounded-2xl border border-brand-navy/15 bg-brand-white p-5 shadow-sm sm:p-7"
            : undefined
        }
        noValidate
        onSubmit={(event) => {
          if (step === "details") {
            event.preventDefault();
            void changeStep("members");
          } else {
            void submit(event);
          }
        }}
      >
        <StepProgress
          ariaLabel="Business profile progress"
          className="mb-6"
          currentStepId={step}
          completedStepIds={step === "members" ? ["details"] : []}
          disabled={mutation.isPending}
          onStepChange={changeStep}
          steps={[
            { id: "details", label: "Business details" },
            { id: "members", label: "Principal / founding members" },
          ]}
        />
        {step === "details" ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <BusinessProfileFields disabled={mutation.isPending} />
            </div>
            <div className="mt-7 flex justify-end">
              <GeneralButton type="submit">Next</GeneralButton>
            </div>
          </>
        ) : (
          <>
            <BusinessMembersTable disabled={mutation.isPending} />
            <div className="mt-5">
              <GeneralButton
                type="button"
                variant="ghost"
                disabled={mutation.isPending}
                onClick={() => setStep("details")}
              >
                Back
              </GeneralButton>
            </div>
            <ProfileFormActions
              error={mutation.isError}
              pending={mutation.isPending}
              readOnly={false}
              saveLabel={businessId ? "Save changes" : "Add business"}
            />
          </>
        )}
      </form>
    </FormProvider>
  );
}
