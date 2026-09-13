import type { Metadata } from "next";

import { FundingOpportunityBrowser } from "@/components/applicant/funding-opportunities/FundingOpportunityBrowser";
import { ProfilePageHeader } from "@/components/applicant/profile/ProfilePageHeader";

export const metadata: Metadata = { title: "Funding opportunities" };

export default function FundingOpportunitiesPage() {
  return (
    <section>
      <ProfilePageHeader
        description="Explore published funding programmes and find the right opportunity for your business."
        title="Funding opportunities"
      />
      <FundingOpportunityBrowser />
    </section>
  );
}
