import type { AdminApplicationOverview } from "@/modules/applications/ApplicationTypes";
import {
  ApplicationReviewHeader,
  ApplicationReviewTabs,
} from "./ApplicationReviewHeader";
import {
  ApplicationDetailsCard,
  ApplicationProgressCard,
} from "./ApplicationReviewSections";

export function ApplicationReview({
  application,
}: {
  application: AdminApplicationOverview;
}) {
  return (
    <div className="space-y-5">
      <ApplicationReviewHeader application={application} />
      <ApplicationReviewTabs />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.8fr)]">
        <ApplicationDetailsCard application={application} />
        <ApplicationProgressCard application={application} />
      </div>
    </div>
  );
}
