import type { FieldPath } from "react-hook-form";

import type { WorkflowTaskFormValues } from "./WorkflowTaskFormSchema";

export const workflowTaskEditorSteps = [
  { id: "details", label: "Task details" },
  { id: "form", label: "Form & layout" },
  { id: "assignment", label: "Assignment & completion" },
] as const;

export type WorkflowTaskEditorStep =
  (typeof workflowTaskEditorSteps)[number]["id"];

export const workflowTaskEditorStepFields = {
  details: [
    "name",
    "taskType",
    "displayOrder",
    "description",
  ],
  form: [
    "formPurpose",
    "formVersionId",
    "displayMode",
    "runAuthoritativeEligibility",
  ],
  assignment: [
    "assignmentMode",
    "assignmentTarget",
    "reviewerCount",
    "completionMode",
    "requiredCompletionCount",
    "completionPercentage",
    "required",
  ],
} satisfies Record<
  WorkflowTaskEditorStep,
  readonly FieldPath<WorkflowTaskFormValues>[]
>;
