import type { FormStatus } from "./FormDefinition";

export const formContextUsages = ["VISIBILITY", "VALIDATION"] as const;

export type FormContextUsage = (typeof formContextUsages)[number];

export type FormBindingHost = {
  type: string;
  referenceId: string;
};

export type FormBindingPrincipal = {
  type: string;
  referenceId?: string;
};

export type FormContextContract = {
  exposedPaths: readonly string[];
  visibilityReferences: readonly string[];
  validationReferences: readonly string[];
};

export type FormRuntimeBinding = {
  key: string;
  formVersionId: string;
  host: FormBindingHost;
  principal: FormBindingPrincipal;
  context: FormContextContract;
};

export type FormRuntimeBindingInput = Omit<
  FormRuntimeBinding,
  "formVersionId"
> & {
  formVersion: {
    id: string;
    status: FormStatus;
  };
};

