import "server-only";

import { getDatabase } from "@/db/client";
import { createApplicationPreflightToken } from "../domain/ApplicationPreflightToken";
import { validateApplicationSubmissionState } from "./ApplicationSubmissionValidation";

export async function preflightOwnedApplication(input: {
  actorId: string;
  applicationId: string;
}) {
  const evaluatedAt = new Date();
  return getDatabase().transaction(async (transaction) => {
    const state = await validateApplicationSubmissionState(transaction, {
      ...input,
      lockApplication: false,
      now: evaluatedAt,
    });
    if (!state) return null;
    const readiness = state.readiness ?? {
      applicationRowVersion: state.application.rowVersion,
      blockers: [],
      evaluatedAt: evaluatedAt.toISOString(),
      formVersionId: state.application.formVersionId ?? "",
      ready: false,
      responseRowVersion: 0,
      sections: [],
    };
    if (!readiness.ready || !state.business || !state.configuration) {
      return { ...readiness, readinessToken: null };
    }
    return {
      ...readiness,
      readinessToken: createApplicationPreflightToken({
        applicationId: state.application.id,
        applicationRowVersion: state.application.rowVersion,
        businessUpdatedAt: state.business.updatedAt.toISOString(),
        configurationFingerprint: state.configurationFingerprint,
        documentFingerprint: state.documentFingerprint,
        ownerUserId: state.application.ownerUserId,
        responseRowVersion: readiness.responseRowVersion,
      }, evaluatedAt),
    };
  }, {
    accessMode: "read only",
    isolationLevel: "repeatable read",
  });
}
