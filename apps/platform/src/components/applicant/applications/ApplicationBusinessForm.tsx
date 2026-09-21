"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSelect } from "@/components/ui/form-fields";
import {
  applicationBusinessSectionSchema,
  type ApplicationBusinessSection,
} from "@/modules/applications/ApplicationSchemas";
import { useApplicationBusinesses } from "@/modules/businesses/BusinessHooks";
import type { ApplicationBusinessOption } from "@/modules/businesses/BusinessTypes";
import {
  ApplicationFormActions,
  saveBeforeNavigate,
} from "./ApplicationFormActions";
import { useApplicationAutosave } from "./useApplicationAutosave";

type Props = {
  applicationId: string;
  error: boolean;
  fundingOpportunityId: string;
  initial: Partial<ApplicationBusinessSection>;
  onBack?: () => void;
  onContinue: (data: ApplicationBusinessSection) => Promise<unknown>;
  onSave: (data: ApplicationBusinessSection) => Promise<unknown>;
  pending: boolean;
};

function businessLabel(business: ApplicationBusinessOption) {
  const identity = business.registrationNumber
    ? `${business.legalName} · ${business.registrationNumber}`
    : business.legalName;
  return business.alreadyApplied ? `${identity} · Already applied` : identity;
}

function businessItems(businesses: ApplicationBusinessOption[]) {
  return businesses.map((business) => ({
    disabled: business.alreadyApplied,
    label: businessLabel(business),
    value: business.id,
  }));
}

function NoBusinesses() {
  return (
    <EmptyState
      action={
        <GeneralButton asChild>
          <Link href="/portal/businesses">
            <Building2 aria-hidden="true" className="size-4" />
            Go to My Businesses
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </GeneralButton>
      }
      message="Applications must be linked to a business in My Businesses. Add your business there, then return to continue this application."
      title="Add a business first"
    />
  );
}

function BusinessesError({ retry }: { retry: () => void }) {
  return (
    <div
      className="rounded-xl border border-brand-orange/30 bg-brand-cream p-5"
      role="alert"
    >
      <p className="font-semibold text-brand-navy">
        Businesses could not be loaded.
      </p>
      <GeneralButton className="mt-3" onClick={retry} type="button" variant="outline">
        <RefreshCw aria-hidden="true" className="size-4" />
        Try again
      </GeneralButton>
    </div>
  );
}

export function ApplicationBusinessForm(props: Props) {
  const businesses = useApplicationBusinesses(
    props.applicationId,
    props.fundingOpportunityId,
  );
  const initialBusinessId = props.initial.businessId ?? "";
  const form = useForm<ApplicationBusinessSection>({
    defaultValues: { businessId: initialBusinessId },
    resolver: zodResolver(applicationBusinessSectionSchema),
  });
  const autosave = useApplicationAutosave(form, props.onSave);
  useEffect(() => {
    if (
      !form.formState.isDirty &&
      form.getValues("businessId") !== initialBusinessId
    ) {
      form.reset({ businessId: initialBusinessId });
    }
  }, [form, form.formState.isDirty, initialBusinessId]);
  if (businesses.isError) {
    return <BusinessesError retry={() => void businesses.refetch()} />;
  }
  if (!businesses.isPending && (businesses.data?.length ?? 0) === 0) {
    return <NoBusinesses />;
  }
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(props.onContinue)}>
        <FormSelect
          disabled={businesses.isPending}
          items={businessItems(businesses.data ?? [])}
          label="Business Name"
          name="businessId"
          required
          placeholder={
            businesses.isPending ? "Loading businesses…" : "Select a business"
          }
        />
        <ApplicationFormActions
          dirty={form.formState.isDirty}
          error={props.error}
          online={autosave.online}
          onBack={saveBeforeNavigate(
            () => props.onSave(form.getValues()),
            props.onBack,
          )}
          pending={props.pending || autosave.saving || businesses.isPending}
          onSave={() => {
            void props.onSave(form.getValues()).catch(() => undefined);
          }}
        />
      </form>
    </FormProvider>
  );
}
