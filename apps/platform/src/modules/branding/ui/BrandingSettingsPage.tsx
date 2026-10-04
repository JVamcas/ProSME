"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileImage } from "lucide-react";
import Image from "next/image";
import { useForm } from "react-hook-form";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { FileUploadButton } from "@/shared/ui/FileUploadButton";
import { toast } from "@/shared/ui/Toast";
import {
  brandingLogoUploadSchema,
  type BrandingSettingsView,
} from "../api/BrandingSchemas";
import {
  useBrandingSettings,
  useUploadBrandingLogo,
} from "./useBrandingSettings";

type BrandingForm = { logo: File };

function BrandingDetails({ settings }: { settings: BrandingSettingsView }) {
  return (
    <div className="rounded-xl border border-brand-navy/10 bg-brand-cream/40 p-4 text-sm text-brand-navy/65">
      {settings.hasLogo ? (
        <>
          <p className="font-semibold text-brand-navy">{settings.logoFileName}</p>
          <p className="mt-1">
            Last updated {settings.updatedAt
              ? formatLocalDateTime24(settings.updatedAt)
              : "recently"}
          </p>
        </>
      ) : (
        <p>The bundled SME Fund logo is currently used.</p>
      )}
    </div>
  );
}

export function BrandingSettingsPage({ canManage }: { canManage: boolean }) {
  const settings = useBrandingSettings();
  const upload = useUploadBrandingLogo();
  const form = useForm<BrandingForm>({
    resolver: zodResolver(brandingLogoUploadSchema),
  });

  if (settings.isLoading) {
    return (
      <PortalLoadingState
        description="Retrieving the current platform logo."
        title="Loading branding"
      />
    );
  }
  if (settings.isError || !settings.data) {
    return (
      <PortalErrorState
        description="Unable to load branding settings."
        onAction={() => void settings.refetch()}
        title="Branding unavailable"
      />
    );
  }

  const submit = form.handleSubmit(async ({ logo }) => {
    try {
      await upload.mutateAsync(logo);
      form.reset();
      toast.success("Branding logo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update the logo.");
    }
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-5 rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">
            Email and platform branding
          </p>
          <h2 className="mt-2 text-xl font-bold text-brand-navy">SME Fund logo</h2>
          <p className="mt-2 text-sm leading-6 text-brand-navy/65">
            Upload a PNG, JPEG, WebP, or safe SVG image up to 2 MB.
          </p>
        </div>

        <BrandingDetails settings={settings.data} />

        {canManage ? (
          <FileUploadButton
            accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
            label={settings.data.hasLogo ? "Replace logo" : "Upload logo"}
            onFile={(logo) => {
              form.setValue("logo", logo, { shouldValidate: true });
              void submit();
            }}
            uploading={upload.isPending}
          />
        ) : null}
        {form.formState.errors.logo ? (
          <p className="text-sm text-red-700" role="alert">
            {form.formState.errors.logo.message}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">
            Preview
          </p>
          <h2 className="mt-2 text-xl font-bold text-brand-navy">Current logo</h2>
        </div>
        <div className="relative flex min-h-72 items-center justify-center rounded-xl border border-dashed border-brand-navy/20 bg-brand-cream/30 p-8">
          {settings.data.logoUrl ? (
            <Image
              alt="SME Fund branding logo preview"
              className="h-auto max-h-44 w-auto max-w-full object-contain"
              height={180}
              src={settings.data.logoUrl}
              unoptimized
              width={420}
            />
          ) : (
            <FileImage aria-hidden="true" className="size-12 text-brand-navy/35" />
          )}
        </div>
      </section>
    </div>
  );
}
