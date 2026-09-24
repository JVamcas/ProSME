"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import {
  useApplicantProfile,
  useUpdateApplicantProfile,
} from "@/modules/profiles/ProfileHooks";
import {
  applicantContactProfileSchema,
  type ApplicantContactProfileInput,
} from "@/modules/profiles/ProfileSchemas";
import { ApplicantProfileFields } from "./ApplicantProfileFields";
import { ProfileFormActions } from "./ProfileFormActions";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";

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
    return <PortalLoadingState title="Loading your contact" description="Just a moment..." />;
  }

  if (profile.isError || !profile.data) {
    return (
      <PortalErrorState
        onAction={() => void profile.refetch()}
        actionLabel="Retry"
        title="Failed to load contact profile"
        description="There was an error loading the contact profile. Please check your connection and try again."
      />
    );
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
