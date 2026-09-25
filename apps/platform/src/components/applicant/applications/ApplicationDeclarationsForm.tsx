"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  FormProvider,
  useForm,
  type UseFormRegister,
} from "react-hook-form";

import { Checkbox, FieldError } from "@/shared/ui/FormPrimitives";
import { applicationDeclarationItems } from "@/modules/applications/ApplicationDeclarations";
import {
  applicationDeclarationsSectionSchema,
  type ApplicationDeclarationsSection,
} from "@/modules/applications/ApplicationDeclarationSchemas";
import {
  ApplicationFormActions,
  saveBeforeNavigate,
} from "./ApplicationFormActions";
import { useApplicationAutosave } from "./useApplicationAutosave";

const defaults: ApplicationDeclarationsSection = {
  compliance: false,
  falseInformation: false,
  informationAccuracy: false,
  privacyConsent: false,
  terms: false,
};

function DeclarationCheckbox({
  error,
  id,
  register,
  text,
}: {
  error?: string;
  id: keyof ApplicationDeclarationsSection;
  register: UseFormRegister<ApplicationDeclarationsSection>;
  text: string;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-brand-navy">
        <Checkbox
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={Boolean(error)}
          className="mt-0.5 size-5"
          {...register(id)}
        />
        <span>
          {text}
          <span aria-hidden="true" className="ml-1 text-brand-orange">*</span>
        </span>
      </label>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function ApplicationDeclarationsForm({
  error,
  initial,
  onBack,
  onContinue,
  onSave,
  pending,
}: {
  error: boolean;
  initial: Partial<ApplicationDeclarationsSection>;
  onBack?: () => void;
  onContinue: (data: ApplicationDeclarationsSection) => Promise<unknown>;
  onSave: (data: ApplicationDeclarationsSection) => Promise<unknown>;
  pending: boolean;
}) {
  const form = useForm<ApplicationDeclarationsSection>({
    defaultValues: { ...defaults, ...initial },
    resolver: zodResolver(applicationDeclarationsSectionSchema),
  });
  const autosave = useApplicationAutosave(form, onSave);
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onContinue)}>
        <p className="mb-5 text-sm text-brand-navy/65">
          Please read and accept the following declarations.
        </p>
        <div className="space-y-4">
          {applicationDeclarationItems.map((item) => (
            <DeclarationCheckbox
              error={form.formState.errors[item.id]?.message}
              id={item.id}
              key={item.id}
              register={form.register}
              text={item.text}
            />
          ))}
        </div>
        <Link
          className="mt-5 inline-block text-sm font-semibold text-brand-orange underline underline-offset-4"
          href="/terms"
          target="_blank"
        >
          View terms and conditions
        </Link>
        <ApplicationFormActions
          dirty={form.formState.isDirty}
          error={error}
          online={autosave.online}
          onBack={saveBeforeNavigate(
            () => onSave(form.getValues()),
            onBack,
          )}
          pending={pending || autosave.saving}
          onSave={() => {
            void onSave(form.getValues()).catch(() => undefined);
          }}
        />
      </form>
    </FormProvider>
  );
}
