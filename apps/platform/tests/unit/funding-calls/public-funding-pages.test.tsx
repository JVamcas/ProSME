import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LegacyFundingPage from "@/app/(public)/funding/page";
import LegacyCallPage from "@/app/(public)/funding/[fundingCallId]/page";
import LegacyEligibilityPage from "@/app/(public)/eligibility/page";
import EligibilityCallChooser from "@/app/(public)/how-to-apply/eligibility/page";
import EligibilityPage from "@/app/(public)/how-to-apply/funding/[fundingCallId]/eligibility/page";
import {
  findPublicFundingCallById,
  listPublicFundingCalls,
} from "@/modules/funding-calls/application/ServerPublicFundingCallService";
import { permanentRedirect } from "next/navigation";
import { publicCall } from "./PublicFundingCallFixture";

vi.mock(
  "@/modules/funding-calls/application/ServerPublicFundingCallService",
  () => ({
    findPublicFundingCallById: vi.fn(),
    listPublicFundingCalls: vi.fn(),
  }),
);
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  permanentRedirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));
vi.mock(
  "@/modules/eligibility/ui/self-check/PublicEligibilitySelfCheck",
  () => ({
    PublicEligibilitySelfCheck: ({
      fundingCallId,
    }: {
      fundingCallId: string;
    }) => (
      <div data-check-call={fundingCallId}>Call-specific questionnaire</div>
    ),
  }),
);

const params = Promise.resolve({ fundingCallId: publicCall().id });

describe("public application guide routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findPublicFundingCallById).mockResolvedValue(publicCall());
    vi.mocked(listPublicFundingCalls).mockResolvedValue({
      items: [publicCall()],
      nextCursor: null,
      total: 1,
    });
  });

  it("preserves legacy links including their selected funding call", async () => {
    expect(() => LegacyFundingPage()).toThrow("REDIRECT");
    expect(permanentRedirect).toHaveBeenLastCalledWith("/how-to-apply/funding");
    await expect(LegacyCallPage({ params })).rejects.toThrow("REDIRECT");
    expect(permanentRedirect).toHaveBeenLastCalledWith(
      "/how-to-apply/funding/00000000-0000-4000-8000-000000000042",
    );
    await expect(
      LegacyEligibilityPage({
        searchParams: Promise.resolve({ fundingCall: publicCall().id }),
      }),
    ).rejects.toThrow("REDIRECT");
    expect(permanentRedirect).toHaveBeenLastCalledWith(
      "/how-to-apply/funding/00000000-0000-4000-8000-000000000042/eligibility",
    );
    await expect(
      LegacyEligibilityPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT");
    expect(permanentRedirect).toHaveBeenLastCalledWith(
      "/how-to-apply/eligibility",
    );
  });

  it("asks the visitor to choose rather than silently defaulting even when only one call exists", async () => {
    const markup = renderToStaticMarkup(
      await EligibilityCallChooser({ searchParams: Promise.resolve({}) }),
    );
    expect(markup).toContain("Choose a call to check eligibility");
    expect(markup).not.toContain("Call-specific questionnaire");
    expect(markup).toContain(
      "/how-to-apply/funding/00000000-0000-4000-8000-000000000042/eligibility",
    );
  });

  it("runs the questionnaire against the call resolved from the URL", async () => {
    const markup = renderToStaticMarkup(await EligibilityPage({ params }));
    expect(findPublicFundingCallById).toHaveBeenCalledWith(publicCall().id);
    expect(markup).toContain(`data-check-call="${publicCall().id}"`);
    expect(markup).toContain("You are checking");
    expect(markup).toContain("Growth Fund");
    expect(markup).not.toContain("Focus sectors");
  });

  it("does not substitute another call when the requested one does not exist", async () => {
    vi.mocked(findPublicFundingCallById).mockResolvedValue(null);
    await expect(EligibilityPage({ params })).rejects.toThrow("NOT_FOUND");
    expect(listPublicFundingCalls).not.toHaveBeenCalled();
  });

  it("shows a closed call's context without mounting its questionnaire", async () => {
    vi.mocked(findPublicFundingCallById).mockResolvedValue(
      publicCall({ applicationsOpen: false, status: "closed" }),
    );
    const markup = renderToStaticMarkup(await EligibilityPage({ params }));
    expect(markup).toContain("Applications for this funding call have closed");
    expect(markup).not.toContain("Call-specific questionnaire");
  });
});
