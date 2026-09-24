import "server-only";

import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import { getOwnApplicationDocuments } from "./application/ServerApplicationDocumentService";
import type { ApplicationReadView } from "./ApplicationTypes";
import { applicationResponseValues } from "./domain/ApplicationDocumentPolicy";
import {
  applicantSnapshotFields,
  businessSnapshotFields,
  selectedSnapshotDetails,
} from "./domain/ApplicationSnapshotDetails";
import { getOwnApplicationDraft } from "./ServerApplicationFormService";
import { getOwnApplicationStatus } from "./ServerApplicationService";
import { getApplicationSubmissionSnapshot } from "./ServerApplicationSubmissionSnapshotService";

export async function getOwnApplicationReadView(
  user: AuthenticatedUser | null,
  applicationId: string,
  correlationId: string,
): Promise<ApplicationReadView> {
  const [draft, summary] = await Promise.all([
    getOwnApplicationDraft(user, applicationId),
    getOwnApplicationStatus(user, applicationId),
  ]);

  if (summary.status === "draft") {
    const register = await getOwnApplicationDocuments(user, applicationId);
    return {
      applicantDetails: [],
      businessDetails: [],
      documents: register.documents.map((document) => ({
        name: document.fileName,
        requirementKey: document.requirementKey,
        sizeBytes: document.sizeBytes,
        versionId: document.storageStatus === "finalized"
          ? document.versionId
          : null,
      })),
      form: draft.form,
      summary,
      values: draft.draftResponse.values,
    };
  }

  const lodged = await getApplicationSubmissionSnapshot(
    user,
    applicationId,
    correlationId,
  );
  if (lodged.snapshot.form.versionId !== draft.form.versionId) {
    throw new ResourceConflictError(
      "The submitted form version could not be loaded.",
    );
  }

  const documents = lodged.snapshot.documents.flatMap((document) => {
    if (
      typeof document.id !== "string"
      || typeof document.originalName !== "string"
      || typeof document.requirementKey !== "string"
      || typeof document.sizeBytes !== "number"
    ) return [];
    return [{
      name: document.originalName,
      requirementKey: document.requirementKey,
      sizeBytes: document.sizeBytes,
      versionId: document.id,
    }];
  });

  return {
    applicantDetails: selectedSnapshotDetails(lodged.snapshot.applicant, applicantSnapshotFields),
    businessDetails: selectedSnapshotDetails(lodged.snapshot.business, businessSnapshotFields),
    documents,
    form: draft.form,
    summary,
    values: applicationResponseValues(
      draft.form,
      lodged.snapshot.form.normalizedValues,
    ),
  };
}
