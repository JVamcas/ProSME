"use client";

import { useState } from "react";

import { StepProgress } from "@/components/ui/step-progress";
import type {
  ApplicationSection,
  ApplicationUpdateInput,
} from "@/modules/applications/ApplicationSchemas";
import type { ApplicationView } from "@/modules/applications/ApplicationTypes";
import { ApplicationBusinessForm } from "./ApplicationBusinessForm";
import { ApplicationFeedback } from "./ApplicationFeedback";
import { ApplicationFinancialForm } from "./ApplicationFinancialForm";
import { ApplicationProjectForm } from "./ApplicationProjectForm";
import {
  applicationSteps,
  completedApplicationStepIds,
  isApplicationSection,
} from "./ApplicationStepConfig";
import { ProfilePageHeader } from "../profile/ProfilePageHeader";

export type SaveApplication = (
  input: ApplicationUpdateInput,
) => Promise<ApplicationView>;

type SectionProps = {
  application: ApplicationView;
  error: boolean;
  pending: boolean;
  save: SaveApplication;
};

function BusinessForm({ application, error, pending, save }: SectionProps) {
  const version = application.rowVersion;
  return (
    <ApplicationBusinessForm
      error={error}
      initial={application.businessSection}
      pending={pending}
      onSave={(data) =>
        save({
          data,
          expectedRowVersion: version,
          intent: "save",
          section: "business",
        })
      }
      onContinue={(data) =>
        save({
          data,
          expectedRowVersion: version,
          intent: "continue",
          section: "business",
        })
      }
    />
  );
}

function ProjectForm({ application, error, pending, save }: SectionProps) {
  const version = application.rowVersion;
  return (
    <ApplicationProjectForm
      error={error}
      initial={application.projectSection}
      pending={pending}
      onSave={(data) =>
        save({
          data,
          expectedRowVersion: version,
          intent: "save",
          section: "project",
        })
      }
      onContinue={(data) =>
        save({
          data,
          expectedRowVersion: version,
          intent: "continue",
          section: "project",
        })
      }
    />
  );
}

function FinancialForm({ application, error, pending, save }: SectionProps) {
  const version = application.rowVersion;
  return (
    <ApplicationFinancialForm
      error={error}
      initial={application.financialSection}
      pending={pending}
      onSave={(data) =>
        save({
          data,
          expectedRowVersion: version,
          intent: "save",
          section: "financial",
        })
      }
      onContinue={(data) =>
        save({
          data,
          expectedRowVersion: version,
          intent: "continue",
          section: "financial",
        })
      }
    />
  );
}

function SectionForm(props: SectionProps & { section: ApplicationSection }) {
  if (props.section === "business") return <BusinessForm {...props} />;
  if (props.section === "project") return <ProjectForm {...props} />;
  return <FinancialForm {...props} />;
}

export function ApplicationWorkspace({
  application,
  error,
  onReload,
  pending,
  save,
}: {
  application: ApplicationView;
  error?: Error | null;
  onReload: () => void;
  pending: boolean;
  save: SaveApplication;
}) {
  const [selected, setSelected] = useState<ApplicationSection | null>(null);
  const section = selected ?? application.currentSection;
  const completed = Object.values(application.sectionCompletion).every(Boolean);
  const label = applicationSteps.find((item) => item.id === section)?.label;

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
          onStepChange={(id) => {
            if (isApplicationSection(id)) setSelected(id);
          }}
          steps={applicationSteps}
        />
        <div className="p-5 sm:p-8">
          <h2 className="mb-6 text-2xl font-bold text-brand-navy">{label}</h2>
          <SectionForm
            application={application}
            error={Boolean(error)}
            pending={pending}
            save={save}
            section={section}
          />
          <ApplicationFeedback
            completed={completed}
            error={error}
            onReload={onReload}
          />
        </div>
      </div>
    </section>
  );
}
