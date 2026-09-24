import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PublicEligibilitySelfCheckWorkspace } from "@/modules/eligibility/api/PublicEligibilitySelfCheckTransport";
import { PublicEligibilitySelfCheckForm } from "@/modules/eligibility/ui/self-check/PublicEligibilitySelfCheckForm";

const workspace: PublicEligibilitySelfCheckWorkspace = {
  advisory: true,
  configurationToken: "a".repeat(64),
  fundingCall: {
    applicationsOpen: true,
    id: "00000000-0000-4000-8000-000000000042",
    slug: "growth-fund",
    title: "Growth Fund",
  },
  questions: [{
    explanation: "Registration must be active.",
    helpText: "Use the current registration record.",
    id: "b".repeat(32),
    label: "What is the registration status?",
    options: [{
      description: "The registration is active.",
      label: "Registered",
      value: "registered",
    }, {
      description: "The registration is inactive.",
      label: "Not registered",
      value: "not_registered",
    }],
    order: 2,
    progress: { current: 1, total: 1 },
    required: true,
    section: { key: "business", label: "Business details" },
    type: "single-select",
  }],
};

describe("public eligibility self-check form", () => {
  it("renders configured accessible presentation and progress metadata", () => {
    const markup = renderToStaticMarkup(
      <PublicEligibilitySelfCheckForm
        error={null}
        onSubmit={async () => undefined}
        pending={false}
        workspace={workspace}
      />,
    );

    expect(markup).toContain("Business details");
    expect(markup).toContain("Question 0 of 1");
    expect(markup).toContain("0% complete");
    expect(markup).toContain("What is the registration status?");
    expect(markup).not.toContain("Use the current registration record.");
    expect(markup).not.toContain("Registration must be active.");
    expect(markup).toContain("The registration is active.");
    expect(markup).toContain("<fieldset");
    expect(markup).toContain('type="radio"');
    expect(markup).toContain("(required)");
    expect(markup).toContain("Check eligibility");
    expect(markup).toContain("Previous");
    expect(markup).toContain("Your answers stay on this device");
  });
});
