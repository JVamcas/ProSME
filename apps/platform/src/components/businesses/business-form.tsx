"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { BusinessProfileFields } from "@/components/profile/business-profile-fields";
import { ProfileFormActions } from "@/components/profile/profile-form-actions";
import {
  ProfileFormError,
  ProfileFormLoading,
} from "@/components/profile/profile-form-state";
import {
  useBusiness,
  useCreateBusiness,
  useUpdateBusiness,
} from "@/modules/profiles/business.hooks";
import {
  businessProfileSchema,
  type BusinessProfileInput,
} from "@/modules/profiles/profile.schemas";

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

  if (businessId && business.isPending) return <ProfileFormLoading />;
  if (businessId && (business.isError || !business.data)) {
    return <ProfileFormError onRetry={() => void business.refetch()} />;
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
