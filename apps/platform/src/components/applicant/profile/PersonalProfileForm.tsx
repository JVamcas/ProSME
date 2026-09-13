"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  applicantPersonalProfileSchema,
  type ApplicantPersonalProfileInput,
} from "@/modules/profiles/ProfileSchemas";
import {
  useApplicantProfile,
  useUpdateApplicantProfile,
} from "@/modules/profiles/ProfileHooks";
import { ApplicantProfileFields } from "./ApplicantProfileFields";
import { ProfileFormActions } from "./ProfileFormActions";
import { ProfileFormError, ProfileFormLoading } from "./ProfileFormState";

const defaults: ApplicantPersonalProfileInput = {
  firstName: "",
  surname: "",
  position: "",
  dateOfBirth: "",
  nationality: "Namibian",
  region: "",
};

export function PersonalProfileForm({ readOnly }: { readOnly: boolean }) {
  const profile = useApplicantProfile();
  const updateProfile = useUpdateApplicantProfile();
  const form = useForm<ApplicantPersonalProfileInput>({
    defaultValues: defaults,
    resolver: zodResolver(applicantPersonalProfileSchema),
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
    await updateProfile.mutateAsync({ section: "personal", data });
    toast.success("Personal information saved");
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
            section="personal"
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
