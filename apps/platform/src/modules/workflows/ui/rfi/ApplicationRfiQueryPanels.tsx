"use client";

import { QuerySection } from "@/shared/ui/QuerySection";
import { ApplicationSectionSkeleton } from "@/modules/applications/ui/ApplicationDetailSkeleton";
import {
  StaffApplicationRfiTimeline,
  WorkflowRfiSummaryList,
} from "./WorkflowRfiPresentation";
import {
  useContextualWorkflowRfis,
  useOwnedWorkflowRfis,
} from "./useWorkflowRfi";

export function StaffApplicationRfiQueryPanel({
  applicationId,
}: {
  applicationId: string;
}) {
  const query = useContextualWorkflowRfis(applicationId);
  return (
    <QuerySection
      query={query}
      title="information requests"
      loading={<ApplicationSectionSkeleton title="information requests" />}
    >
      {(requests) => <StaffApplicationRfiTimeline requests={requests} />}
    </QuerySection>
  );
}

export function ApplicantApplicationRfiQueryPanel({
  applicationId,
}: {
  applicationId: string;
}) {
  const query = useOwnedWorkflowRfis(applicationId);
  return (
    <QuerySection
      query={query}
      title="information requests"
      loading={<ApplicationSectionSkeleton title="information requests" />}
    >
      {(requests) => (
        <WorkflowRfiSummaryList
          applicationId={applicationId}
          requests={requests}
        />
      )}
    </QuerySection>
  );
}
