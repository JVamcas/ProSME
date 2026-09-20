import "server-only";

import {
  formDefinitionDialogSchema,
  formEditorSchema,
} from "@/modules/forms/api/FormSchemas";
import {
  createStandardFormDrafts,
  type StandardFormDraft,
} from "@/modules/forms/domain/StandardFormCatalogue";
import { formPublicationErrors } from "@/modules/forms/FormDefinitionValidation";
import { insertMissingStandardFormDrafts } from "@/modules/forms/infrastructure/StandardFormSeedRepository";

function validateDraft(draft: StandardFormDraft): StandardFormDraft {
  const definition = formDefinitionDialogSchema.parse({
    code: draft.code,
    description: draft.description,
    instructions: draft.instructions,
    name: draft.name,
    submitLabel: draft.submitLabel,
  });
  const editor = formEditorSchema.parse({
    expectedRowVersion: 1,
    fields: draft.fields,
    sections: draft.sections,
    submitLabel: draft.submitLabel,
  });
  const errors = formPublicationErrors(
    editor.fields,
    editor.sections,
    editor.submitLabel,
  );
  if (errors.length) {
    throw new Error(`${draft.code}: ${errors.join(" ")}`);
  }
  return {
    ...definition,
    fields: editor.fields,
    instructions: definition.instructions ?? "",
    sections: editor.sections,
  };
}

export async function seedStandardFormDrafts() {
  const drafts = createStandardFormDrafts().map(validateDraft);
  const uniqueCodes = new Set(drafts.map((draft) => draft.code));
  if (uniqueCodes.size !== drafts.length) {
    throw new Error("The standard form catalogue contains duplicate codes.");
  }
  return insertMissingStandardFormDrafts(drafts);
}
