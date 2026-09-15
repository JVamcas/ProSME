"use client";

import { useState } from "react";

import { StepProgress } from "@/components/ui/step-progress";
import type {
  ApplicationSubmission,
  ApplicationView,
} from "@/modules/applications/ApplicationTypes";
import { ApplicationFeedback } from "./ApplicationFeedback";
import { ApplicationReview } from "./ApplicationReview";
import { ApplicationSubmissionConfirmation } from "./ApplicationSubmissionConfirmation";
import {
  ApplicationSectionForm,
  type SaveApplication,
} from "./ApplicationSectionForm";
import {
  applicationSteps,
  type ApplicationStepId,
  completedApplicationStepIds,
  isApplicationSection,
  previousApplicationStep,
} from "./ApplicationStepConfig";
import { ProfilePageHeader } from "../profile/ProfilePageHeader";

export type { SaveApplication } from "./ApplicationSectionForm";

export function ApplicationWorkspace({
  application,
  error,
  onReload,
  pending,
  save,
  submission,
  submit = async () => undefined,
}: {
  application: ApplicationView;
  error?: Error | null;
  onReload: () => void;
  pending: boolean;
  save: SaveApplication;
  submission?: ApplicationSubmission;
  submit?: () => Promise<unknown>;
}) {
  const completed = Object.values(application.sectionCompletion).every(Boolean);
  const [selected, setSelected] = useState<ApplicationStepId | null>(null);
  const section = selected ?? (completed ? "review" : application.currentSection);
  const label = section === "review"
    ? "Review and submit"
    : applicationSteps.find((item) => item.id === section)?.label;
  const previousSection = previousApplicationStep(section);
  const visibleSteps = applicationSteps.map((step) => ({
    ...step,
    disabled: step.id === "review" && !completed,
  }));
  const saveAndNavigate: SaveApplication = async (input) => {
    const updated = await save(input);
    if (input.intent === "continue") {
      const readyForReview = input.section === "declarations"
        && Object.values(updated.sectionCompletion).every(Boolean);
      setSelected(readyForReview ? "review" : updated.currentSection);
    }
    return updated;
  };

  if (submission) {
    return <ApplicationSubmissionConfirmation submission={submission} />;
  }

  return (
    <section>
      <ProfilePageHeader
        eyebrow="Funding applications"
        title={application.fundingOpportunityTitle}
        description=""
      />
      <div className="mt-6 overflow-hidden rounded-2xl border border-brand-navy/15 bg-brand-white shadow-sm">
        <StepProgress
          ariaLabel="Application sections"
          className="border-b border-brand-navy/10 px-5 py-5"
          completedStepIds={completedApplicationStepIds(
            application.sectionCompletion,
          )}
          currentStepId={section}
          onStepChange={setSelected}
          steps={visibleSteps}
        />
        <div className="p-5 sm:p-8">
          <h2 className="mb-6 text-2xl font-bold text-brand-navy">{label}</h2>
          {isApplicationSection(section) ? (
            <ApplicationSectionForm
              application={application}
              error={Boolean(error)}
              onBack={
                previousSection
                  ? () => setSelected(previousSection)
                  : undefined
              }
              pending={pending}
              save={saveAndNavigate}
              section={section}
            />
          ) : (
            <ApplicationReview
              application={application}
              onBack={() => setSelected("declarations")}
              onEdit={setSelected}
              onSubmit={submit}
              pending={pending}
            />
          )}
          <ApplicationFeedback
            error={error}
            onReload={onReload}
          />
        </div>
      </div>
    </section>
  );
}
