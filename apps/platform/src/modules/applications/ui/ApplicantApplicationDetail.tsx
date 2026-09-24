import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { ApplicationReadView } from "../ApplicationTypes";
import { applicationReadSections } from "../domain/ApplicationReadAnswers";
import { applicantDetailProgressLabel } from "../domain/ApplicationDetailStatus";
import { ApplicationDetailActions } from "./ApplicationDetailActions";
import { ApplicationDetailView } from "./ApplicationDetailView";
import type { ApplicationDetailModel } from "./ApplicationDetailTypes";

function applicantDetailModel(data: ApplicationReadView): ApplicationDetailModel {
  const { summary } = data;
  const businessName = summary.businessName
    ?? data.businessDetails.find((detail) => detail.label === "Trading name")?.value
    ?? data.businessDetails.find((detail) => detail.label === "Legal name")?.value
    ?? "Not selected";
  const requestedAmount = data.values.REQUESTED_GRANT_AMOUNT;
  const projectLocation = data.values.PROJECT_LOCATION;
  const businessRegion = data.businessDetails.find(
    (detail) => detail.label === "Region",
  )?.value;
  const facts = [
    { label: "Business name", value: businessName },
    { label: "Funding opportunity", value: summary.fundingOpportunityTitle },
    { label: "Application reference", value: summary.reference ?? "Pending submission" },
    { label: "Form completion", value: `${summary.progressPercent}%` },
    {
      label: "Amount requested",
      value: typeof requestedAmount === "number"
        ? `N$ ${new Intl.NumberFormat("en-NA").format(requestedAmount)}`
        : "Not provided",
    },
    {
      label: "Project location",
      value: typeof projectLocation === "string" && projectLocation.trim()
        ? projectLocation
        : businessRegion ?? "Not provided",
    },
    {
      label: "Submission date",
      value: summary.submittedAt
        ? formatLocalDateTime24(summary.submittedAt)
        : "Not submitted",
    },
  ];

  return {
    applicantDetails: data.applicantDetails,
    backHref: "/portal/applications",
    backLabel: "My applications",
    businessDetails: data.businessDetails,
    documents: data.documents.map((document) => ({
      href: document.versionId
        ? `/api/portal/applications/${summary.id}/documents/${document.versionId}/download`
        : null,
      key: `${document.requirementKey}-${document.versionId ?? document.name}`,
      name: document.name,
      sizeBytes: document.sizeBytes,
      type: document.requirementKey.replaceAll("_", " "),
    })),
    facts,
    reference: summary.reference,
    sections: applicationReadSections(data.form, data.values),
    statusDescription: summary.publicStatus.description,
    statusLabel: summary.publicStatus.label,
    statusBadgeLabel: applicantDetailProgressLabel(summary.publicStatus.status),
    submittedAt: summary.submittedAt,
    title: summary.fundingOpportunityTitle,
    updatedAt: summary.updatedAt,
  };
}

export function ApplicantApplicationDetail({
  canDeleteDraft,
  canWithdraw,
  data,
}: {
  canDeleteDraft: boolean;
  canWithdraw: boolean;
  data: ApplicationReadView;
}) {
  return (
    <ApplicationDetailView
      actions={
        <ApplicationDetailActions
          application={data.summary}
          canDeleteDraft={canDeleteDraft}
          canWithdraw={canWithdraw}
        />
      }
      model={applicantDetailModel(data)}
    />
  );
}
