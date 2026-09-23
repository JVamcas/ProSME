import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
import { getFormRuntime } from "@/modules/forms/infrastructure/FormRepository";
import { attachBusinessFieldsToForm } from "../domain/AttachedApplicationForm";

export async function getAttachedApplicationForm(
  formVersionId: string,
  fundingCallId: string,
) {
  const [form, calls] = await Promise.all([
    getFormRuntime(formVersionId),
    getDatabase()
      .select({ formVersionId: fundingCalls.formVersionId })
      .from(fundingCalls)
      .where(eq(fundingCalls.id, fundingCallId))
      .limit(1),
  ]);
  if (!form) return null;
  return calls[0]?.formVersionId === formVersionId
    ? attachBusinessFieldsToForm(form, fundingCallId)
    : form;
}
