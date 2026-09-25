import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  formDefinitions,
  formFields,
  formVersions,
} from "./form.schema";

export async function readFormReadinessProjection(versionId: string) {
  const rows = await getDatabase()
    .select({
      active: formDefinitions.active,
      purpose: formDefinitions.purpose,
      fieldKey: formFields.key,
      fieldLabel: formFields.label,
      fieldRequired: formFields.required,
      fieldType: formFields.type,
      status: formVersions.status,
      versionId: formVersions.id,
    })
    .from(formVersions)
    .innerJoin(
      formDefinitions,
      eq(formDefinitions.id, formVersions.formDefinitionId),
    )
    .leftJoin(formFields, eq(formFields.formVersionId, formVersions.id))
    .where(eq(formVersions.id, versionId));
  const [version] = rows;
  if (!version) return null;
  return {
    active: version.active,
    purpose: version.purpose,
    fields: rows.flatMap((field) => field.fieldKey
      ? [{
          key: field.fieldKey,
          label: field.fieldLabel!,
          required: field.fieldRequired!,
          type: field.fieldType!,
        }]
      : []),
    status: version.status,
    versionId: version.versionId,
  };
}
