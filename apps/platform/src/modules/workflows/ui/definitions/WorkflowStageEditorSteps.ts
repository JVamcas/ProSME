import type { FieldPath } from "react-hook-form";

import type { WorkflowStageFormInput } from "./WorkflowStageFormSchema";

export const workflowStageEditorSteps = [
  { id: "details", label: "Details" },
  { id: "behaviour", label: "Behaviour" },
  { id: "entry", label: "Entry rules" },
  { id: "exit", label: "Exit rules" },
  { id: "review", label: "Review" },
] as const;

export type WorkflowStageEditorStep =
  (typeof workflowStageEditorSteps)[number]["id"];

export const workflowStageEditorStepFields = {
  details: [
    "name",
    "description",
    "publicStatusMapping.status",
    "publicStatusMapping.label",
    "publicStatusMapping.description",
  ],
  behaviour: [
    "enabled",
    "optional",
    "repeatable",
    "coiGated",
    "coiFormVersionId",
  ],
  entry: ["joinPredecessorStageKeys", "entryCondition"],
  exit: ["exitCondition"],
  review: [],
} satisfies Record<
  WorkflowStageEditorStep,
  readonly FieldPath<WorkflowStageFormInput>[]
>;
