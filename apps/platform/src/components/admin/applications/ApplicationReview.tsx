import type { AdminApplication } from "@/modules/applications/ApplicationTypes";
import {
  ApplicationReviewHeader,
  ApplicationWorkflow,
} from "./ApplicationReviewHeader";
import { ApplicationReviewDetails } from "./ApplicationReviewSections";

export function ApplicationReview({
  application,
}: {
  application: AdminApplication;
}) {
  return (
    <div className="p-4 sm:p-7">
      <ApplicationReviewHeader application={application} />
      <ApplicationWorkflow status={application.status} />
      <ApplicationReviewDetails application={application} />
    </div>
  );
}
