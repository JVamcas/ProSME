import "server-only";

import { and, eq, ne, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  formDefinitions,
  formSections,
  formVersions,
} from "@/db/schema";
import type {
  FormDisplayMode,
  FormPurpose,
  FormField,
  FormSection,
} from "@/modules/forms/FormTypes";
import { formPublicationErrors } from "@/modules/forms/FormDefinitionValidation";
import {
  copyFormVersionChildren,
  readPublicationFields,
  replaceDraftContent,
} from "./FormFieldWriteRepository";

export async function createForm(input: {
  actorId: string;
  code: string;
  description: string;
  displayMode?: FormDisplayMode;
  instructions?: string | null;
  name: string;
  purpose: FormPurpose;
  submitLabel: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [definition] = await transaction
      .insert(formDefinitions)
      .values({
        code: input.code,
        createdBy: input.actorId,
        description: input.description,
        name: input.name,
        purpose: input.purpose,
      })
      .returning();
    const [version] = await transaction
      .insert(formVersions)
      .values({
        createdBy: input.actorId,
        displayMode: input.displayMode ?? "SINGLE_PAGE",
        formDefinitionId: definition.id,
        instructions: input.instructions ?? null,
        submitLabel: input.submitLabel,
        versionNumber: 1,
      })
      .returning();
    return { definition, version };
  });
}

export async function cloneFormVersion(input: {
  actorId: string;
  definitionId: string;
  sourceVersionId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [definition] = await transaction
      .select({ id: formDefinitions.id })
      .from(formDefinitions)
      .where(eq(formDefinitions.id, input.definitionId))
      .for("update")
      .limit(1);
    if (!definition) return null;
    const [draft] = await transaction
      .select({ id: formVersions.id })
      .from(formVersions)
      .where(
        and(
          eq(formVersions.formDefinitionId, input.definitionId),
          eq(formVersions.status, "DRAFT"),
        ),
      )
      .limit(1);
    if (draft) return null;
    const [latest] = await transaction
      .select({
        versionNumber: sql<number>`coalesce(max(${formVersions.versionNumber}), 0)`,
      })
      .from(formVersions)
      .where(eq(formVersions.formDefinitionId, input.definitionId));
    const [source] = await transaction
      .select()
      .from(formVersions)
      .where(
        and(
          eq(formVersions.id, input.sourceVersionId),
          eq(formVersions.formDefinitionId, input.definitionId),
        ),
      )
      .limit(1);
    if (!source || source.status === "DRAFT") return null;
    const [version] = await transaction
      .insert(formVersions)
      .values({
        createdBy: input.actorId,
        displayMode: source.displayMode,
        formDefinitionId: input.definitionId,
        instructions: source.instructions,
        submitLabel: source.submitLabel,
        versionNumber: Number(latest.versionNumber) + 1,
      })
      .returning();
    await copyFormVersionChildren(transaction, source.id, version.id);
    return version;
  });
}

export async function saveFormDraft(input: {
  actorId: string;
  code?: string;
  definitionId: string;
  description?: string;
  displayMode?: FormDisplayMode;
  expectedRowVersion: number;
  fields: FormField[];
  instructions?: string | null;
  name?: string;
  purpose?: FormPurpose;
  sections: FormSection[];
  submitLabel: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    if (input.purpose) {
      const [definition] = await transaction
        .select({ purpose: formDefinitions.purpose })
        .from(formDefinitions)
        .where(eq(formDefinitions.id, input.definitionId))
        .for("update")
        .limit(1);
      if (definition && definition.purpose !== input.purpose) {
        const [published] = await transaction
          .select({ id: formVersions.id })
          .from(formVersions)
          .where(and(
            eq(formVersions.formDefinitionId, input.definitionId),
            ne(formVersions.status, "DRAFT"),
          ))
          .limit(1);
        if (published) {
          throw new ResourceConflictError(
            "A form's purpose cannot change after a version is published.",
          );
        }
      }
    }
    const [version] = await transaction
      .update(formVersions)
      .set({
        displayMode: input.displayMode ?? "SINGLE_PAGE",
        instructions: input.instructions ?? null,
        rowVersion: input.expectedRowVersion + 1,
        submitLabel: input.submitLabel,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(formVersions.formDefinitionId, input.definitionId),
          eq(formVersions.status, "DRAFT"),
          eq(formVersions.rowVersion, input.expectedRowVersion),
        ),
      )
      .returning();
    if (!version) return null;
    if (input.code || input.description !== undefined || input.name || input.purpose) {
      await transaction
        .update(formDefinitions)
        .set({
          code: input.code,
          description: input.description,
          name: input.name,
          purpose: input.purpose,
          updatedAt: new Date(),
        })
        .where(eq(formDefinitions.id, input.definitionId));
    }
    await replaceDraftContent(
      transaction,
      version.id,
      input.fields,
      input.sections,
    );
    return version;
  });
}

export async function publishFormVersion(input: {
  actorId: string;
  definitionId: string;
  versionId: string;
  expectedRowVersion: number;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [current] = await transaction
      .select()
      .from(formVersions)
      .where(
        and(
          eq(formVersions.id, input.versionId),
          eq(formVersions.formDefinitionId, input.definitionId),
          eq(formVersions.status, "DRAFT"),
          eq(formVersions.rowVersion, input.expectedRowVersion),
        ),
      )
      .for("update")
      .limit(1);
    if (!current) return { kind: "conflict" as const };
    const [fields, sections] = await Promise.all([
      readPublicationFields(transaction, input.versionId),
      transaction
        .select()
        .from(formSections)
        .where(eq(formSections.formVersionId, input.versionId)),
    ]);
    const errors = formPublicationErrors(
      fields,
      sections,
      current.submitLabel,
    );
    if (errors.length) return { errors, kind: "invalid" as const };
    const [version] = await transaction
      .update(formVersions)
      .set({
        publishedAt: new Date(),
        publishedBy: input.actorId,
        rowVersion: input.expectedRowVersion + 1,
        status: "PUBLISHED",
        updatedAt: new Date(),
      })
      .where(eq(formVersions.id, input.versionId))
      .returning();
    return { kind: "published" as const, version };
  });
}

export async function retireFormVersion(input: {
  actorId: string;
  definitionId: string;
  versionId: string;
  expectedRowVersion: number;
}) {
  const [version] = await getDatabase()
    .update(formVersions)
    .set({
      retiredAt: new Date(),
      rowVersion: input.expectedRowVersion + 1,
      status: "RETIRED",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(formVersions.id, input.versionId),
        eq(formVersions.formDefinitionId, input.definitionId),
        eq(formVersions.status, "PUBLISHED"),
        eq(formVersions.rowVersion, input.expectedRowVersion),
      ),
    )
    .returning();
  return version ?? null;
}
