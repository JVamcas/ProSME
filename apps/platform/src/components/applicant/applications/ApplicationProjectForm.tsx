"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import {
  applicationProjectSectionSchema,
  type ApplicationProjectSection,
} from "@/modules/applications/ApplicationSchemas";
import {
  ApplicationFormActions,
  saveBeforeNavigate,
} from "./ApplicationFormActions";
import { useApplicationAutosave } from "./useApplicationAutosave";
import { FormDateInput } from "@/components/ui/form-date-input";

const defaults: ApplicationProjectSection = {
  projectEndDate: "",
  projectStartDate: "",
  projectSummary: "",
  projectTitle: "",
};

function ProjectFields({ summary }: { summary: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormInput
        containerClassName="sm:col-span-2"
        label="Project title"
        name="projectTitle"
        required
      />
      <FormTextarea
        containerClassName="sm:col-span-2"
        label="Project summary"
        labelAccessory={
          <span className="text-xs text-brand-navy/50">
            {summary.length}/500
          </span>
        }
        maxLength={500}
        name="projectSummary"
        required
      />
      <FormDateInput
        label="Project start date"
        name="projectStartDate"
        required
      />
      <FormDateInput label="Project end date" name="projectEndDate" required />
    </div>
  );
}

export function ApplicationProjectForm({
  error,
  initial,
  onBack,
  onContinue,
  onSave,
  pending,
}: {
  error: boolean;
  initial: Partial<ApplicationProjectSection>;
  onBack?: () => void;
  onContinue: (data: ApplicationProjectSection) => Promise<unknown>;
  onSave: (data: ApplicationProjectSection) => Promise<unknown>;
  pending: boolean;
}) {
  const form = useForm<ApplicationProjectSection>({
    defaultValues: { ...defaults, ...initial },
    resolver: zodResolver(applicationProjectSectionSchema),
  });
  const summary = useWatch({ control: form.control, name: "projectSummary" });
  const autosave = useApplicationAutosave(form, onSave);
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onContinue)}>
        <ProjectFields summary={summary} />
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
