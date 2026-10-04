import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/platform/auth/ServerAuthNavigation", () => ({
  getAuthenticatedPageUser: async () => ({ id: "applicant" }),
}));
vi.mock("@/auth/authorization/current-user", () => ({
  getCurrentUser: async () => ({ id: "applicant" }),
}));
vi.mock("@/auth/authorization/policy", () => ({ can: () => true }));
vi.mock("@/modules/applications/ui/NewApplicationChooser", () => ({
  NewApplicationChooser: ({ fundingOpportunityId }: { fundingOpportunityId?: string }) => (
    <div data-selected-call={fundingOpportunityId} />
  ),
}));

import ApplyPage from "@/app/(portal)/portal/applications/new/page";

describe("new application page context", () => {
  it("passes the call from the Apply link and asks only for the business", async () => {
    const page = await ApplyPage({
      searchParams: Promise.resolve({ fundingOpportunityId: "selected-call" }),
    });
    const markup = renderToStaticMarkup(page);
    expect(markup).toContain('data-selected-call="selected-call"');
    expect(markup).toContain("Select the business you represent");
    expect(markup).not.toContain("Select a funding opportunity");
  });

  it("keeps opportunity selection for direct visits without a call", async () => {
    const page = await ApplyPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(page);
    expect(markup).not.toContain("data-selected-call");
    expect(markup).toContain("Select a funding opportunity");
  });
});
