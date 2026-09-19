"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { BusinessProfileFields } from "@/components/applicant/businesses/BusinessProfileFields";
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
import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";

const defaults: BusinessProfileInput = {
  businessType: "",
  employeeCount: "",
  establishedYear: "",
  legalName: "",
  physicalAddress: "",
  region: "",
  registrationNumber: "",
  sector: "",
  tradingName: "",
};

export function BusinessForm({ businessId }: { businessId?: string }) {
  const router = useRouter();
  const business = useBusiness(businessId);
  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness(businessId ?? "new");
  const form = useForm<BusinessProfileInput>({
    defaultValues: defaults,
    resolver: zodResolver(businessProfileSchema),
  });

  useEffect(() => {
    if (business.data) form.reset(business.data);
  }, [business.data, form]);

  if (businessId && business.isPending)
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
  const submit = form.handleSubmit(async (input) => {
    await mutation.mutateAsync(input);
    toast.success(businessId ? "Business updated" : "Business added");
    router.push("/portal/businesses");
  });

  return (
    <FormProvider {...form}>
      <form
        className="mt-6 rounded-2xl border border-brand-navy/15 bg-brand-white p-5 shadow-sm sm:p-7"
        noValidate
        onSubmit={submit}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <BusinessProfileFields disabled={mutation.isPending} />
        </div>
        <ProfileFormActions
          error={mutation.isError}
          pending={mutation.isPending}
          readOnly={false}
          saveLabel={businessId ? "Save changes" : "Add business"}
        />
      </form>
    </FormProvider>
  );
}
