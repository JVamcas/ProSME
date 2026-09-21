import type { FormField, FormSection } from "../FormTypes";

export type StandardFormSeed = {
  code: string;
  description: string;
  fields: FormField[];
  instructions: string;
  name: string;
  publishOnSeed?: boolean;
  sections: FormSection[];
  submitLabel: string;
};
