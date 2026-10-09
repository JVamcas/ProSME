import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { fundingCallPublicationRevisions } from "@/modules/funding-calls/infrastructure/funding-call.schema";
import { getFormRuntime } from "@/modules/forms/infrastructure/FormRepository";
import { attachBusinessFieldsToForm } from "../domain/AttachedApplicationForm";

export async function getAttachedApplicationForm(
  formVersionId: string,
  fundingCallId: string,
) {
  const [form, bindings] = await Promise.all([
    getFormRuntime(formVersionId),
    getDatabase()
      .select({ id: fundingCallPublicationRevisions.id })
      .from(fundingCallPublicationRevisions)
      .where(
        and(
          eq(fundingCallPublicationRevisions.fundingCallId, fundingCallId),
          sql`${fundingCallPublicationRevisions.snapshot}->>'formVersionId' = ${formVersionId}`,
        ),
      )
      .limit(1),
  ]);
  if (!form) return null;
  return bindings.length
    ? attachBusinessFieldsToForm(form, fundingCallId)
    : form;
}
