import type {
  FormDefinitionSummary,
  FormSection,
  FormVersionSummary,
} from "./domain/FormDefinition";

export {
  formStatuses,
  type FormDefinitionSummary,
  type FormSection,
  type FormStatus,
  type FormVersionSummary,
} from "./domain/FormDefinition";

export const formFieldTypes = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "YES_NO",
  "SELECT",
] as const;
export type FormFieldType = (typeof formFieldTypes)[number];

export type FormOption = {
  key: string;
  label: string;
  order: number;
};
export type FormField = {
  id?: string;
  sectionId: string;
  columnSpan: 1 | 2 | 3;
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  helpText?: string | null;
  order: number;
  options?: FormOption[];
};

export type FormEditorView = {
  definition: Omit<
    FormDefinitionSummary,
    | "fieldCount"
    | "sectionCount"
    | "usedByCount"
    | "latestVersion"
    | "latestStatus"
  >;
  version: FormVersionSummary;
  sections: FormSection[];
  fields: FormField[];
  versions: FormVersionSummary[];
  allowedActions: string[];
};

export type FormRuntimeSchema = {
  versionId: string;
  versionNumber: number;
  instructions: string | null;
  submitLabel: string;
  sections: FormSection[];
  fields: FormField[];
};

export type PublishedFormOption = {
  definitionId: string;
  formName: string;
  versionId: string;
  versionNumber: number;
};

export type FormSubmission = {
  id: string;
  taskInstanceId: string;
  formVersionId: string;
  status: "DRAFT" | "COMPLETED";
  values: Record<string, unknown>;
  rowVersion: number;
  completedAt: string | null;
};
