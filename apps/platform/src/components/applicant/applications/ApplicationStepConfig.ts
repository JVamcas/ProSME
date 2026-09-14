import type { StepProgressItem } from "@/components/ui/step-progress";
import type {
  ApplicationSection,
  ApplicationSectionCompletion,
} from "@/modules/applications/ApplicationSchemas";

export type ApplicationStepId =
  ApplicationSection | "documents" | "declarations" | "review";

export const applicationSteps: StepProgressItem<ApplicationStepId>[] = [
  { id: "business", label: "Business" },
  { id: "project", label: "Project details" },
  { id: "financial", label: "Financial information" },
  { disabled: true, id: "documents", label: "Documents" },
  { disabled: true, id: "declarations", label: "Declarations" },
  { disabled: true, id: "review", label: "Review" },
];

export function completedApplicationStepIds(
  completion: ApplicationSectionCompletion,
) {
  return applicationSteps
    .filter((step) =>
      step.id === "business" || step.id === "project" || step.id === "financial"
        ? completion[step.id]
        : false,
    )
    .map((step) => step.id);
}

export function isApplicationSection(
  id: ApplicationStepId,
): id is ApplicationSection {
  return id === "business" || id === "project" || id === "financial";
}
