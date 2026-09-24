import "server-only";

import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError, ResourceNotFoundError } from "@/lib/resource-errors";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { applicationResponseValues } from "./domain/ApplicationDocumentPolicy";
import { applicationReadSections } from "./domain/ApplicationReadAnswers";
import { applicantDetailProgressLabel } from "./domain/ApplicationDetailStatus";
import {
  applicantSnapshotFields,
  businessSnapshotFields,
  selectedSnapshotDetails,
} from "./domain/ApplicationSnapshotDetails";
import { getAttachedApplicationForm } from "./infrastructure/AttachedApplicationFormRepository";
import { getAdminApplicationOverview } from "./ServerAdminApplicationService";
import { getApplicationSubmissionSnapshot } from "./ServerApplicationSubmissionSnapshotService";
import type { ApplicationDetailModel } from "./ui/ApplicationDetailTypes";

function snapshotDocuments(
  documents: Record<string, unknown>[],
  applicationId: string,
): ApplicationDetailModel["documents"] {
  return documents.flatMap((document) => {
    if (
      typeof document.id !== "string"
      || typeof document.originalName !== "string"
      || typeof document.requirementKey !== "string"
      || typeof document.sizeBytes !== "number"
    ) return [];
    return [{
      href: `/api/admin/applications/${applicationId}/documents/${document.id}/download`,
      key: document.id,
      name: document.originalName,
      sizeBytes: document.sizeBytes,
      type: document.requirementKey.replaceAll("_", " "),
    }];
  });
}

export async function getAdminApplicationDetail(
  user: AuthenticatedUser | null,
  applicationId: string,
  correlationId: string,
) {
  const overview = await getAdminApplicationOverview(user, applicationId);
  if (!overview) throw new ResourceNotFoundError("application");

  const lodged = await getApplicationSubmissionSnapshot(
    user,
    applicationId,
    correlationId,
  );
  const fundingCallId = lodged.snapshot.fundingCall.id;
  if (typeof fundingCallId !== "string") {
    throw new ResourceConflictError("The lodged funding call is unavailable.");
  }
  const form = await getAttachedApplicationForm(
    lodged.snapshot.form.versionId,
    fundingCallId,
  );
  if (!form || form.versionId !== lodged.snapshot.form.versionId) {
    throw new ResourceConflictError("The lodged application form is unavailable.");
  }

  const applicantDetails = selectedSnapshotDetails(
    lodged.snapshot.applicant,
    applicantSnapshotFields,
  );
  const businessDetails = selectedSnapshotDetails(
    lodged.snapshot.business,
    businessSnapshotFields,
  );
  const requestedAmount = lodged.snapshot.form.normalizedValues.REQUESTED_GRANT_AMOUNT;
  const amount = typeof requestedAmount === "number"
    ? requestedAmount
    : overview.requestedAmount;
  const projectLocation = lodged.snapshot.form.normalizedValues.PROJECT_LOCATION;
  const location = typeof projectLocation === "string" && projectLocation.trim()
    ? projectLocation
    : overview.location ?? "Not provided";
  const businessName = overview.businessName
    ?? businessDetails.find((detail) => detail.label === "Trading name")?.value
    ?? businessDetails.find((detail) => detail.label === "Legal name")?.value
    ?? "Not selected";
  const facts = [
    { label: "Business name", value: businessName },
    { label: "Funding opportunity", value: overview.opportunityTitle },
    { label: "Application reference", value: overview.reference },
    { label: "Form completion", value: "100%" },
    {
      label: "Amount requested",
      value: amount === null
        ? "Not provided"
        : `N$ ${new Intl.NumberFormat("en-NA").format(amount)}`,
    },
    { label: "Project location", value: location },
    { label: "Submission date", value: formatLocalDateTime24(overview.submittedAt) },
  ];

  const model: ApplicationDetailModel = {
    applicantDetails,
    backHref: "/admin/applications",
    backLabel: "Applications",
    businessDetails,
    documents: snapshotDocuments(lodged.snapshot.documents, applicationId),
    facts,
    reference: overview.reference,
    sections: applicationReadSections(
      form,
      applicationResponseValues(form, lodged.snapshot.form.normalizedValues),
    ),
    statusDescription: overview.publicStatus.description,
    statusLabel: overview.publicStatus.label,
    statusBadgeLabel: applicantDetailProgressLabel(overview.publicStatus.status),
    submittedAt: overview.submittedAt,
    title: overview.opportunityTitle,
    updatedAt: overview.updatedAt,
  };
  return { model, overview };
}
