import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/content/ServerContentQueries", () => ({
  getStatistics: vi.fn(),
}));

import { StatisticsBlock } from "@/modules/content/ui/public/StatisticsBlock";

describe("Home Impact block", () => {
  it("renders the configured copy and statistics", async () => {
    const component = await StatisticsBlock({
      block: {
        heading: "Impact heading",
        summary: "Impact introduction",
        campaignMessage: "Impact message",
        items: [{ value: "42", label: "Businesses supported" }],
      },
    });
    const markup = renderToStaticMarkup(component);

    expect(markup).toContain("Impact heading");
    expect(markup).toContain("Impact introduction");
    expect(markup).toContain("Impact message");
    expect(markup).toContain("Businesses supported");
  });
});
