import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";
import { RequestValidationError } from "@/lib/resource-errors";
import { formPublicationErrors } from "../FormDefinitionValidation";
import { readPublicationFields } from "./FormFieldWriteRepository";
import { formDefinitions, formSections, formVersions } from "./form.schema";

/** The caller owns the transaction and authorizes any draft publication. */
export async function publishAttachedFormVersions(
  transaction: DatabaseTransaction,
  versionIds: readonly string[],
  actorId: string,
  authorize: () => void,
) {
  const ids = [...new Set(versionIds)].sort();
  if (!ids.length) return;
  const versions = await transaction
    .select({
      id: formVersions.id,
      status: formVersions.status,
      submitLabel: formVersions.submitLabel,
      name: formDefinitions.name,
      active: formDefinitions.active,
    })
    .from(formVersions)
    .innerJoin(
      formDefinitions,
      eq(formDefinitions.id, formVersions.formDefinitionId),
    )
    .where(inArray(formVersions.id, ids))
    .orderBy(asc(formVersions.id))
    .for("update", { of: formVersions });
  if (versions.length !== ids.length) {
    throw new RequestValidationError(
      "An attached form version no longer exists.",
    );
  }
  for (const version of versions) {
    if (!version.active || !["DRAFT", "PUBLISHED"].includes(version.status)) {
      throw new RequestValidationError(
        `The attached form “${version.name}” is inactive or retired.`,
      );
    }
  }
  const drafts = versions.filter((version) => version.status === "DRAFT");
  if (!drafts.length) return;
  authorize();
  const draftIds = drafts.map((version) => version.id);
  const [fields, sections] = await Promise.all([
    readPublicationFields(transaction, draftIds),
    transaction
      .select()
      .from(formSections)
      .where(inArray(formSections.formVersionId, draftIds)),
  ]);
  const fieldsByVersion = Map.groupBy(fields, (field) => field.formVersionId);
  const sectionsByVersion = Map.groupBy(
    sections,
    (section) => section.formVersionId,
  );
  for (const draft of drafts) {
    const errors = formPublicationErrors(
      fieldsByVersion.get(draft.id) ?? [],
      sectionsByVersion.get(draft.id) ?? [],
      draft.submitLabel,
    );
    if (errors.length) {
      throw new RequestValidationError(
        `Cannot publish form “${draft.name}”: ${errors.join(" ")}`,
      );
    }
  }
  const now = new Date();
  // Preserve the standalone publisher's metadata promotion, in one set-based write.
  await transaction.execute(sql`
    UPDATE ${formDefinitions} AS definition
    SET code = COALESCE(source.metadata->>'code', definition.code),
        name = COALESCE(source.metadata->>'name', definition.name),
        description = COALESCE(source.metadata->>'description', definition.description),
        updated_at = ${now}
    FROM (
      SELECT DISTINCT ON (${formVersions.formDefinitionId})
        ${formVersions.formDefinitionId} AS definition_id, ${formVersions.metadata} AS metadata
      FROM ${formVersions}
      WHERE ${inArray(formVersions.id, draftIds)}
      ORDER BY ${formVersions.formDefinitionId}, ${formVersions.versionNumber} DESC
    ) AS source
    WHERE definition.id = source.definition_id
  `);
  await transaction
    .update(formVersions)
    .set({
      status: "PUBLISHED",
      publishedAt: now,
      publishedBy: actorId,
      updatedAt: now,
      rowVersion: sql`${formVersions.rowVersion} + 1`,
    })
    .where(inArray(formVersions.id, draftIds));
}
