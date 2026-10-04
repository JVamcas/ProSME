"use client";

import { QuerySection } from "@/shared/ui/QuerySection";
import { QueryRefreshButton } from "@/shared/ui/QueryRefreshButton";
import { ApplicantApplicationRfiQueryPanel } from "@/modules/workflows/ui/rfi/ApplicationRfiQueryPanels";
import { ApplicantApplicationDetail } from "./ApplicantApplicationDetail";
import {
  ApplicationDetailSkeleton,
  ApplicationDetailPageFrame,
} from "./ApplicationDetailSkeleton";
import { useOwnApplicationReadView } from "./useApplications";
import { useApplicationAccessCleanup } from "./useApplicationAccessCleanup";

export function ApplicantApplicationDetailWorkspace({
  applicationId,
  canDeleteDraft,
  canWithdraw,
  canReadInformationRequests,
}: {
  applicationId: string;
  canDeleteDraft: boolean;
  canWithdraw: boolean;
  canReadInformationRequests: boolean;
}) {
  const query = useOwnApplicationReadView(applicationId);
  useApplicationAccessCleanup(applicationId, "applicant", query.error);

  if (query.isError || !query.data) {
    return (
      <ApplicationDetailPageFrame audience="applicant">
        <QuerySection
          query={query}
          title="application details"
          loading={<ApplicationDetailSkeleton />}
        >
          {() => null}
        </QuerySection>
      </ApplicationDetailPageFrame>
    );
  }

  return (
    <ApplicantApplicationDetail
      additionalActions={
        <QueryRefreshButton
          refreshing={query.isFetching}
          onRefresh={() => void query.refetch()}
        />
      }
      canDeleteDraft={canDeleteDraft}
      canWithdraw={canWithdraw}
      data={query.data}
      showRequests={canReadInformationRequests}
      requestsPanel={
        canReadInformationRequests ? (
          <ApplicantApplicationRfiQueryPanel applicationId={applicationId} />
        ) : undefined
      }
    />
  );
}
