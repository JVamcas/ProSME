import type { StepProgressItem } from "@/components/ui/step-progress";
import type {
  ApplicationSection,
  ApplicationSectionCompletion,
} from "@/modules/applications/ApplicationSchemas";

export type ApplicationStepId =
  ApplicationSection | "review";

export const applicationSteps: StepProgressItem<ApplicationStepId>[] = [
  { id: "business", label: "Business" },
  { id: "project", label: "Project details" },
  { id: "financial", label: "Financial information" },
  { id: "documents", label: "Documents" },
  { id: "declarations", label: "Declarations" },
  { id: "review", label: "Review" },
];

export function completedApplicationStepIds(
  completion: ApplicationSectionCompletion,
) {
  return applicationSteps
    .filter((step) =>
      step.id !== "review"
        ? completion[step.id]
        : false,
    )
    .map((step) => step.id);
}

export function isApplicationSection(
  id: ApplicationStepId,
): id is ApplicationSection {
  return id !== "review";
}

export function previousApplicationSection(section: ApplicationSection) {
  if (section === "project") return "business";
  if (section === "financial") return "project";
  if (section === "documents") return "financial";
  if (section === "declarations") return "documents";
  return null;
}

export function previousApplicationStep(section: ApplicationStepId) {
  return section === "review"
    ? "declarations"
    : previousApplicationSection(section);
}
