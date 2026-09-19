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

export const formInputTypes = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "MONEY",
  "DATE",
  "SELECT",
  "RADIO",
  "CHECKBOX",
] as const;
export type FormInputType = (typeof formInputTypes)[number];

export const formDataTypes = [
  "TEXT",
  "INTEGER",
  "DECIMAL",
  "MONEY",
  "DATE",
  "BOOLEAN",
] as const;
export type FormDataType = (typeof formDataTypes)[number];

export type FormOption = {
  code: string;
  label: string;
  position: number;
};
export type FormValidation = {
  max?: number;
  maxLength?: number;
  min?: number;
  minLength?: number;
};
export type FormField = {
  id?: string;
  code: string;
  label: string;
  inputType: FormInputType;
  dataType: FormDataType;
  rowIndex: number;
  columnIndex: 1 | 2;
  columnSpan: 1 | 2;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  validation?: FormValidation | null;
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
