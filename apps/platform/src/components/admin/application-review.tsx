import type { AdminApplication } from "@/modules/applications/application.types";
import {
  ApplicationReviewHeader,
  ApplicationWorkflow,
} from "./application-review-header";
import { ApplicationReviewDetails } from "./application-review-sections";

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
