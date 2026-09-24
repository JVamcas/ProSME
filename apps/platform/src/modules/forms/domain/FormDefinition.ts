import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";

export const formStatuses = ["DRAFT", "PUBLISHED", "RETIRED"] as const;
export const formDisplayModes = ["SINGLE_PAGE", "STEPS"] as const;

export type FormStatus = (typeof formStatuses)[number];
export type FormDisplayMode = (typeof formDisplayModes)[number];

export type FormSection = {
  id?: string;
  columnSpan: 1 | 2 | 3;
  showContainer: boolean;
  key: string;
  title: string;
  description: string;
  order: number;
  visibilityCondition?: ConditionGroup | null;
};

export type FormVersionSummary = {
  id: string;
  formDefinitionId: string;
  versionNumber: number;
  status: FormStatus;
  instructions: string | null;
  displayMode: FormDisplayMode;
  submitLabel: string;
  rowVersion: number;
  createdAt: string;
  publishedAt: string | null;
  retiredAt: string | null;
};

export type FormDefinitionSummary = {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  latestVersionId: string | null;
  latestVersion: number | null;
  latestVersionRowVersion: number | null;
  latestStatus: FormStatus | null;
  sectionCount: number;
  fieldCount: number;
  usedByCount: number;
  updatedAt: string;
};
