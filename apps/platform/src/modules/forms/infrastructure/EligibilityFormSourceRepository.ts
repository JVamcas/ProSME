import "server-only";

import { and, eq, inArray, ne, notInArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { attachedBusinessFieldKeys } from "@/modules/applications/domain/AttachedApplicationForm";
import type { ConditionFieldType } from "@/modules/conditions/domain/ConditionConfiguration";
import { formFields, formSections } from "./form.schema";

const conditionTypes = {
  CURRENCY: "NUMBER",
  DATE: "DATE",
  NUMBER: "NUMBER",
  PERCENTAGE: "NUMBER",
  SINGLE_SELECT: "TEXT",
  TEXT: "TEXT",
  TEXTAREA: "TEXT",
  YES_NO: "BOOLEAN",
} as const satisfies Partial<Record<string, ConditionFieldType>>;

export type EligibilityFormSource = {
  id: string;
  key: string;
  label: string;
  type: ConditionFieldType;
  versionId: string;
};

export async function readEligibilityFormSources(
  versionIds: readonly string[],
): Promise<EligibilityFormSource[]> {
  if (!versionIds.length) return [];
  const records = await getDatabase()
    .select({
      id: formFields.id,
      key: formFields.key,
      label: formFields.label,
      type: formFields.type,
      versionId: formFields.formVersionId,
    })
    .from(formFields)
    .innerJoin(formSections, eq(formSections.id, formFields.sectionId))
    .where(and(
      inArray(formFields.formVersionId, [...versionIds]),
      ne(formSections.key, "ENTITY_DETAILS"),
      notInArray(formFields.key, [...attachedBusinessFieldKeys]),
    ));
  return records.flatMap((record) => {
    const type = conditionTypes[record.type as keyof typeof conditionTypes];
    return type ? [{ ...record, type }] : [];
  });
}
