import type {
  ApplicationSection,
  ApplicationUpdateInput,
} from "@/modules/applications/ApplicationSchemas";
import type { ApplicationView } from "@/modules/applications/ApplicationTypes";
import { ApplicationBusinessForm } from "./ApplicationBusinessForm";
import { ApplicationDeclarationsForm } from "./ApplicationDeclarationsForm";
import { ApplicationDocumentsForm } from "./ApplicationDocumentsForm";
import { ApplicationFinancialForm } from "./ApplicationFinancialForm";
import { ApplicationProjectForm } from "./ApplicationProjectForm";

export type SaveApplication = (
  input: ApplicationUpdateInput,
) => Promise<ApplicationView>;

type SectionProps = {
  application: ApplicationView;
  error: boolean;
  onBack?: () => void;
  pending: boolean;
  save: SaveApplication;
};

function BusinessForm({
  application,
  error,
  onBack,
  pending,
  save,
}: SectionProps) {
  const expectedRowVersion = application.rowVersion;
  return (
    <ApplicationBusinessForm
      applicationId={application.id}
      error={error}
      fundingOpportunityId={application.fundingOpportunityId}
      initial={application.businessSection}
      onBack={onBack}
      pending={pending}
      onSave={(data) =>
        save({
          data,
          expectedRowVersion,
          intent: "save",
          section: "business",
        })
      }
      onContinue={(data) =>
        save({
          data,
          expectedRowVersion,
          intent: "continue",
          section: "business",
        })
      }
    />
  );
}

function ProjectForm({
  application,
  error,
  onBack,
  pending,
  save,
}: SectionProps) {
  const expectedRowVersion = application.rowVersion;
  return (
    <ApplicationProjectForm
      error={error}
      initial={application.projectSection}
      onBack={onBack}
      pending={pending}
      onSave={(data) =>
        save({ data, expectedRowVersion, intent: "save", section: "project" })
      }
      onContinue={(data) =>
        save({
          data,
          expectedRowVersion,
          intent: "continue",
          section: "project",
        })
      }
    />
  );
}

function FinancialForm({
  application,
  error,
  onBack,
  pending,
  save,
}: SectionProps) {
  const expectedRowVersion = application.rowVersion;
  return (
    <ApplicationFinancialForm
      error={error}
      initial={application.financialSection}
      onBack={onBack}
      pending={pending}
      onSave={(data) =>
        save({
          data,
          expectedRowVersion,
          intent: "save",
          section: "financial",
        })
      }
      onContinue={(data) =>
        save({
          data,
          expectedRowVersion,
          intent: "continue",
          section: "financial",
        })
      }
    />
  );
}

function DocumentsForm({ application, onBack, pending, save }: SectionProps) {
  const expectedRowVersion = application.rowVersion;
  return (
    <ApplicationDocumentsForm
      applicationId={application.id}
      onBack={onBack}
      pending={pending}
      onContinue={() =>
        save({
          data: {},
          expectedRowVersion,
          intent: "continue",
          section: "documents",
        })
      }
    />
  );
}

function DeclarationsForm({
  application,
  error,
  onBack,
  pending,
  save,
}: SectionProps) {
  const expectedRowVersion = application.rowVersion;
  return (
    <ApplicationDeclarationsForm
      error={error}
      initial={application.declarationsSection}
      onBack={onBack}
      pending={pending}
      onSave={(data) =>
        save({
          data,
          expectedRowVersion,
          intent: "save",
          section: "declarations",
        })
      }
      onContinue={(data) =>
        save({
          data,
          expectedRowVersion,
          intent: "continue",
          section: "declarations",
        })
      }
    />
  );
}

export function ApplicationSectionForm(
  props: SectionProps & { section: ApplicationSection },
) {
  if (props.section === "business") return <BusinessForm {...props} />;
  if (props.section === "project") return <ProjectForm {...props} />;
  if (props.section === "financial") return <FinancialForm {...props} />;
  if (props.section === "documents") return <DocumentsForm {...props} />;
  return <DeclarationsForm {...props} />;
}
