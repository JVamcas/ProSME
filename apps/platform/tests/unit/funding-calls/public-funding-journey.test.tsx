import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { defaultEligibilityFocusSection } from "@/modules/content/EligibilityPageContent";
import {
  defaultFundingPriorities,
  defaultFundingSupport,
} from "@/modules/content/FundingPageContent";
import { PublicFundingCallCard } from "@/modules/funding-calls/ui/public/PublicFundingCallCard";
import { PublicFundingCallList } from "@/modules/funding-calls/ui/public/PublicFundingCallList";
import { PublicFundingCallNextStep } from "@/modules/funding-calls/ui/public/PublicFundingCallNextStep";
import { PublicFundingPage } from "@/modules/funding-calls/ui/public/PublicFundingPage";
import { publicCall } from "./PublicFundingCallFixture";

const detailHref = "/how-to-apply/funding/00000000-0000-4000-8000-000000000042";

describe("public funding journey", () => {
  it("links both actions to the specific call and shows its actual amount and date", () => {
    const markup = renderToStaticMarkup(
      <PublicFundingCallCard call={publicCall()} />,
    );
    expect(markup).toContain(`href="${detailHref}"`);
    expect(markup).toContain(`href="${detailHref}/eligibility"`);
    expect(markup).toContain("200,000");
    expect(markup).toContain("31 Oct 2026");
    expect(markup).not.toContain('href="/eligibility"');
  });

  it("renders funding calls as compact cards in a horizontal rail", () => {
    const call = publicCall({
      thumbnailUrl: "/api/public/funding-calls/thumbnail",
    });
    const markup = renderToStaticMarkup(
      <PublicFundingCallList
        calls={{
          items: [call, { ...call, id: `${call.id}-2` }],
          nextCursor: null,
          total: 2,
        }}
      />,
    );

    expect(markup).toContain("overflow-x-auto");
    expect(markup).toContain("snap-x");
    expect(markup).toContain("shrink-0");
    expect(markup).toContain('aria-label="Previous funding calls"');
    expect(markup).toContain('aria-label="Next funding calls"');
    expect(markup).toContain("aspect-[3/2]");
    expect(markup).toContain("/api/public/funding-calls/thumbnail");
    expect(markup).toContain("Growth");
    expect(markup).toContain("Check eligibility");
  });

  it.each([
    { applicationsOpen: false, status: "closed" as const },
    { selfCheckAvailable: false },
  ])("omits the self-check when unavailable: %j", (overrides) => {
    const call = publicCall(overrides);
    const markup = renderToStaticMarkup(<PublicFundingCallCard call={call} />);
    const sidebar = renderToStaticMarkup(
      <PublicFundingCallNextStep call={call} />,
    );
    expect(markup).not.toContain(`${detailHref}/eligibility`);
    expect(sidebar).not.toContain(`${detailHref}/eligibility`);
    expect(sidebar).toContain("not currently available");
  });

  it("preserves editorial content and places sectors outside the questionnaire", () => {
    const markup = renderToStaticMarkup(
      <PublicFundingPage
        calls={{ items: [publicCall()], nextCursor: null, total: 1 }}
        focus={defaultEligibilityFocusSection}
        priorities={defaultFundingPriorities}
        sectors={[
          { description: "", kind: "focusSector", label: "Agriculture" },
        ]}
        support={defaultFundingSupport}
      />,
    );
    expect(markup.indexOf("Available funding calls")).toBeLessThan(
      markup.indexOf("What the fund supports"),
    );
    for (const item of defaultFundingSupport.uses)
      expect(markup).toContain(item);
    expect(markup).toContain("Youth-owned and women-owned enterprises");
    expect(markup).toContain("Agriculture");
    expect(markup).toContain("this is not an exclusion list");
    expect(markup).toContain('aria-current="step"');
  });
});
