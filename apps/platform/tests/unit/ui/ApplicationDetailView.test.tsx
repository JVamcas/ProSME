import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ApplicationDetailView } from "@/modules/applications/ui/ApplicationDetailView";
import type { ApplicationDetailModel } from "@/modules/applications/ui/ApplicationDetailTypes";

const model: ApplicationDetailModel = {
  applicantDetails: [],
  backHref: "/portal/applications",
  backLabel: "My applications",
  businessDetails: [],
  documents: [{
    href: "/api/portal/applications/id/documents/version/download",
    key: "version",
    name: "Business plan.pdf",
    sizeBytes: 2048,
    type: "Business plan",
  }],
  facts: [
    { label: "Business name", value: "Example SME" },
    { label: "Funding opportunity", value: "Growth Grant" },
    { label: "Application reference", value: "SME-001" },
    { label: "Form completion", value: "100%" },
    { label: "Amount requested", value: "N$ 250,000" },
    { label: "Project location", value: "Windhoek" },
    { label: "Submission date", value: "24 Sep 2026" },
  ],
  reference: "SME-001",
  sections: [{
    key: "project",
    title: "Project summary",
    answers: [{ key: "GOAL", label: "Goal", value: "Expand production" }],
  }],
  statusDescription: "Your application is being reviewed.",
  statusLabel: "Under review",
  statusBadgeLabel: "IN PROGRESS",
  submittedAt: "2026-09-24T12:00:00.000Z",
  title: "Growth Grant",
  updatedAt: "2026-09-24T12:00:00.000Z",
};

describe("shared application detail view", () => {
  it("shows the seven overview facts and shared Overview/Documents tabs", () => {
    const markup = renderToStaticMarkup(
      <ApplicationDetailView model={model} />,
    );

    for (const fact of model.facts) {
      expect(markup).toContain(fact.label);
    }
    expect(markup).toContain("IN PROGRESS");
    expect(markup).toContain("Last updated:");
    expect(markup).toContain("Documents (1)");
    expect(markup).toContain("Project summary");
    expect(markup).not.toContain("Answers by section");
  });
});
