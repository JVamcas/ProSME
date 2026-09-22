import "server-only";

import { inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { ConditionFieldType } from "@/modules/conditions/domain/ConditionConfiguration";
import { formFields } from "./form.schema";

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
    .where(inArray(formFields.formVersionId, [...versionIds]));
  return records.flatMap((record) => {
    const type = conditionTypes[record.type as keyof typeof conditionTypes];
    return type ? [{ ...record, type }] : [];
  });
}
