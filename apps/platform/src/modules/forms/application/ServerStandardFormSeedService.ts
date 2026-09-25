import "server-only";

import {
  formDefinitionDialogSchema,
  formEditorSchema,
} from "@/modules/forms/api/FormSchemas";
import { createStandardForms } from "@/modules/forms/domain/StandardFormCatalogue";
import type { StandardFormSeed } from "@/modules/forms/domain/StandardFormDefinition";
import { formPublicationErrors } from "@/modules/forms/FormDefinitionValidation";
import { insertMissingStandardForms } from "@/modules/forms/infrastructure/StandardFormSeedRepository";

function validateSeed(seed: StandardFormSeed): StandardFormSeed {
  const definition = formDefinitionDialogSchema.parse({
    code: seed.code,
    description: seed.description,
    displayMode: seed.displayMode ?? "SINGLE_PAGE",
    instructions: seed.instructions,
    name: seed.name,
    purpose: seed.purpose,
    submitLabel: seed.submitLabel,
  });
  const editor = formEditorSchema.parse({
    expectedRowVersion: 1,
    displayMode: definition.displayMode,
    fields: seed.fields,
    sections: seed.sections,
    submitLabel: seed.submitLabel,
  });
  const errors = formPublicationErrors(
    editor.fields,
    editor.sections,
    editor.submitLabel,
  );
  if (errors.length) {
    throw new Error(`${seed.code}: ${errors.join(" ")}`);
  }
  return {
    ...definition,
    fields: editor.fields,
    instructions: definition.instructions ?? "",
    publishOnSeed: seed.publishOnSeed,
    sections: editor.sections,
  };
}

export async function seedStandardForms() {
  const forms = createStandardForms().map(validateSeed);
  const uniqueCodes = new Set(forms.map((form) => form.code));
  if (uniqueCodes.size !== forms.length) {
    throw new Error("The standard form catalogue contains duplicate codes.");
  }
  return insertMissingStandardForms(forms);
}
