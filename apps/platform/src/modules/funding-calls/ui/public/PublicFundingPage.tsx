import type { EligibilityItem } from "@/modules/content/ContentTypes";
import type { EligibilityFocusSection } from "@/modules/content/EligibilityPageContent";
import type {
  FundingPrioritiesContent,
  FundingSupportContent,
} from "@/modules/content/FundingPageContent";
import { ApplicantJourney } from "@/modules/content/ui/public/ApplicantJourney";
import { FocusSectors } from "@/modules/content/ui/public/FocusSectors";
import { FundingPriorities } from "@/modules/content/ui/public/FundingPriorities";
import { FundingSupport } from "@/modules/content/ui/public/FundingSupport";
import { Breadcrumbs } from "@/shared/ui/navigation/Breadcrumbs";
import type {
  PublicFundingCallPage,
  PublicFundingCallStatus,
} from "../../api/PublicFundingCallTransport";
import { PublicFundingCallList } from "./PublicFundingCallList";

export function PublicFundingPage({
  calls,
  focus,
  priorities,
  sectors,
  status,
  support,
}: {
  calls: PublicFundingCallPage;
  focus: EligibilityFocusSection;
  priorities: FundingPrioritiesContent;
  sectors: EligibilityItem[];
  status?: PublicFundingCallStatus;
  support: FundingSupportContent;
}) {
  return (
    <>
      <div className="container pt-8 sm:pt-10">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/how-to-apply", label: "How to Apply" },
            { label: "Funding calls" },
          ]}
        />
        <h1 className="display text-3xl font-bold leading-tight text-brand-navy sm:text-5xl">
          Find funding for your next step
        </h1>
        <p className="mt-3 text-brand-navy/65">
          Explore a call, check your eligibility, then apply.
        </p>
        <ApplicantJourney step={1} />
      </div>
      <PublicFundingCallList calls={calls} status={status} />
      <FundingSupport content={support} />
      <FundingPriorities content={priorities} />
      <FocusSectors content={focus} items={sectors} />
    </>
  );
}
