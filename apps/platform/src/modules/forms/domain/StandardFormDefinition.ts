import type { FormDisplayMode, FormField, FormSection } from "../FormTypes";

export type StandardFormSeed = {
  code: string;
  description: string;
  displayMode?: FormDisplayMode;
  fields: FormField[];
  instructions: string;
  name: string;
  purpose: import("./FormPurpose").FormPurpose;
  publishOnSeed?: boolean;
  sections: FormSection[];
  submitLabel: string;
};
