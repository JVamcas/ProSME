import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ApplicationCards,
  ApplicationsTable,
} from "@/modules/applications/ui/applicant/ApplicationTable";
import type { ApplicationSummary } from "@/modules/applications/ApplicationTypes";

const application: ApplicationSummary = {
  businessName: "Example SME Fund",
  canWithdraw: false,
  createdAt: "2026-09-18T08:00:00.000Z",
  currentSection: "declarations",
  fundingOpportunityId: "10000000-0000-4000-8000-000000000001",
  fundingOpportunityTitle: "Growth Funding Programme",
  id: "20000000-0000-4000-8000-000000000002",
  progressPercent: 100,
  publicStatus: {
    actionRequired: false,
    description: "Your application is being reviewed.",
    label: "Under review",
    status: "UNDER_REVIEW",
  },
  reference: "SME Fund-2026-00482",
  status: "submitted",
  submittedAt: "2026-09-18T08:00:00.000Z",
  updatedAt: "2026-09-22T08:00:00.000Z",
};

describe("applicant application list navigation", () => {
  it("links the Opportunity column to details without an Actions column", () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <ApplicationsTable items={[application]} />
      </QueryClientProvider>,
    );

    expect(markup).toContain(
      'href="/portal/applications/20000000-0000-4000-8000-000000000002"',
    );
    expect(markup).toContain("Growth Funding Programme");
    expect(markup).not.toContain(">Actions<");
  });

  it("links the mobile card title to the same details page", () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <ApplicationCards items={[application]} renderAction={() => null} />
      </QueryClientProvider>,
    );
    expect(markup).toContain(
      'href="/portal/applications/20000000-0000-4000-8000-000000000002"',
    );
  });
});
