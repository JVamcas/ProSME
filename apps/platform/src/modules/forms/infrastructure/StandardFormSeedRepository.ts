import "server-only";

import { inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  formDefinitions,
  formFieldOptions,
  formFields,
  formSections,
  formVersions,
  users,
} from "@/db/schema";
import type { StandardFormDraft } from "@/modules/forms/domain/StandardFormCatalogue";

export type StandardFormSeedResult = {
  createdCodes: string[];
  skippedCodes: string[];
};

const systemUserId = "00000000-0000-4000-8000-000000000001";
const systemUserEmail = "system@internal.sme-fund";

async function ensureSystemUser(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
) {
  await transaction.insert(users).values({
    displayName: "System",
    email: systemUserEmail,
    id: systemUserId,
    status: "disabled",
    userType: "staff",
  }).onConflictDoNothing();
  const [systemUser] = await transaction
    .select({ email: users.email })
    .from(users)
    .where(inArray(users.id, [systemUserId]))
    .limit(1);
  if (systemUser?.email !== systemUserEmail) {
    throw new Error("The reserved System user identifier is unavailable.");
  }
}

export async function insertMissingStandardFormDrafts(
  drafts: StandardFormDraft[],
): Promise<StandardFormSeedResult> {
  return getDatabase().transaction(async (transaction) => {
    const requestedCodes = drafts.map((draft) => draft.code);
    const existing = await transaction
      .select({ code: formDefinitions.code })
      .from(formDefinitions)
      .where(inArray(formDefinitions.code, requestedCodes));
    const existingCodes = new Set(existing.map((item) => item.code));
    const missing = drafts.filter((draft) => !existingCodes.has(draft.code));
    const skippedCodes = drafts
      .filter((draft) => existingCodes.has(draft.code))
      .map((draft) => draft.code);

    if (!missing.length) {
      return { createdCodes: [], skippedCodes };
    }

    await ensureSystemUser(transaction);

    const records = missing.map((draft) => ({
      definitionId: crypto.randomUUID(),
      draft,
      versionId: crypto.randomUUID(),
    }));

    await transaction.insert(formDefinitions).values(
      records.map(({ definitionId, draft }) => ({
        code: draft.code,
        createdBy: systemUserId,
        description: draft.description,
        id: definitionId,
        name: draft.name,
      })),
    );
    await transaction.insert(formVersions).values(
      records.map(({ definitionId, draft, versionId }) => ({
        createdBy: systemUserId,
        formDefinitionId: definitionId,
        id: versionId,
        instructions: draft.instructions,
        status: "DRAFT" as const,
        submitLabel: draft.submitLabel,
        versionNumber: 1,
      })),
    );

    await transaction.insert(formSections).values(
      records.flatMap(({ draft, versionId }) => draft.sections.map((section) => ({
        columnSpan: section.columnSpan,
        description: section.description,
        formVersionId: versionId,
        id: section.id!,
        key: section.key,
        order: section.order,
        showContainer: section.showContainer,
        visibilityCondition: section.visibilityCondition ?? null,
        title: section.title,
      }))),
    );

    const seededFields = records.flatMap(({ draft, versionId }) => (
      draft.fields.map((field) => ({
        field,
        fieldId: crypto.randomUUID(),
        versionId,
      }))
    ));
    await transaction.insert(formFields).values(
      seededFields.map(({ field, fieldId, versionId }) => ({
        columnSpan: field.columnSpan,
        formVersionId: versionId,
        helpText: field.helpText ?? null,
        id: fieldId,
        key: field.key,
        label: field.label,
        maximum: field.maximum ?? null,
        maxLength: field.maxLength ?? null,
        minimum: field.minimum ?? null,
        minLength: field.minLength ?? null,
        order: field.order,
        required: field.required,
        sectionId: field.sectionId,
        type: field.type,
        visibilityCondition: field.visibilityCondition ?? null,
      })),
    );

    const seededOptions = seededFields.flatMap(({ field, fieldId }) => (
      (field.options ?? []).map((option) => ({
        fieldId,
        key: option.key,
        label: option.label,
        order: option.order,
      }))
    ));
    if (seededOptions.length) {
      await transaction.insert(formFieldOptions).values(seededOptions);
    }

    return {
      createdCodes: missing.map((draft) => draft.code),
      skippedCodes,
    };
  });
}
