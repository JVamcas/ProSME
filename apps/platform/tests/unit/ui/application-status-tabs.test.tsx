import { describe, expect, it } from "vitest";

import { applicationTabs } from "@/components/applicant/applications/ApplicationsList";

describe("application status tabs", () => {
  it("renders each aggregate returned by the applications API", () => {
    const tabs = applicationTabs({
      all: 9,
      completed: 1,
      draft: 2,
      submitted: 3,
      underReview: 3,
    });

    expect(tabs.map((tab) => tab.label)).toEqual([
      "All (9)",
      "Drafts (2)",
      "Submitted (3)",
      "Under review (3)",
      "Completed (1)",
    ]);
    expect(tabs.every((tab) => !tab.disabled)).toBe(true);
  });
});
