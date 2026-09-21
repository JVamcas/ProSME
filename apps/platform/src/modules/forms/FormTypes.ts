import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
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
export {
  formContextUsages,
  type FormBindingHost,
  type FormBindingPrincipal,
  type FormContextContract,
  type FormContextUsage,
  type FormRuntimeBinding,
  type FormRuntimeBindingInput,
} from "./domain/FormRuntimeBinding";

export const formFieldTypes = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "CURRENCY",
  "PERCENTAGE",
  "DATE",
  "YES_NO",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "DOCUMENT",
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
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  order: number;
  options?: FormOption[];
  visibilityCondition?: ConditionGroup | null;
};

export type FormEditorView = {
  definition: Omit<
    FormDefinitionSummary,
    | "fieldCount"
    | "sectionCount"
    | "usedByCount"
    | "latestVersionId"
    | "latestVersion"
    | "latestVersionRowVersion"
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
  status?: "DRAFT" | "PUBLISHED";
  versionId: string;
  versionNumber: number;
};

export type FormDefinitionPage = {
  items: FormDefinitionSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type FormResponse = {
  id: string;
  workflowTaskId: string;
  formVersionId: string;
  respondentUserId: string;
  status: "DRAFT" | "COMPLETED";
  values: Record<string, unknown>;
  definitionSnapshot: FormRuntimeSchema | null;
  rowVersion: number;
  completedAt: string | null;
};

export type TaskFormData = {
  context: Readonly<Record<
    string,
    import("./engine/FormRuntimeContext").FormContextValue
  >>;
  schema: FormRuntimeSchema;
  response: FormResponse | null;
  taskRowVersion: number;
};
