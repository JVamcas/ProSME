"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  applicantContactProfileSchema,
  type ApplicantContactProfileInput,
} from "@/modules/profiles/profile.schemas";
import {
  useApplicantProfile,
  useUpdateApplicantProfile,
} from "@/modules/profiles/profile.hooks";
import { ApplicantProfileFields } from "./applicant-profile-fields";
import { ProfileFormActions } from "./profile-form-actions";
import { ProfileFormError, ProfileFormLoading } from "./profile-form-state";

const defaults: ApplicantContactProfileInput = {
  phoneNumber: "",
  postalAddress: "",
};

export function ContactProfileForm({ readOnly }: { readOnly: boolean }) {
  const profile = useApplicantProfile();
  const updateProfile = useUpdateApplicantProfile();
  const form = useForm<ApplicantContactProfileInput>({
    defaultValues: defaults,
    resolver: zodResolver(applicantContactProfileSchema),
  });

  useEffect(() => {
    if (profile.data) {
      form.reset(profile.data);
    }
  }, [form, profile.data]);

  if (profile.isPending) {
    return <ProfileFormLoading />;
  }

  if (profile.isError || !profile.data) {
    return <ProfileFormError onRetry={() => void profile.refetch()} />;
  }

  const submit = form.handleSubmit(async (data) => {
    await updateProfile.mutateAsync({ section: "contact", data });
    toast.success("Contact details saved");
  });

  return (
    <FormProvider {...form}>
      <form
        className="mt-6 rounded-2xl border border-brand-navy/15 bg-brand-white p-5 shadow-sm sm:p-7"
        noValidate
        onSubmit={submit}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <ApplicantProfileFields
            disabled={readOnly}
            email={profile.data.email}
            section="contact"
          />
        </div>
        <ProfileFormActions
          error={updateProfile.isError}
          pending={updateProfile.isPending}
          readOnly={readOnly}
          saveLabel="Save"
        />
      </form>
    </FormProvider>
  );
}
