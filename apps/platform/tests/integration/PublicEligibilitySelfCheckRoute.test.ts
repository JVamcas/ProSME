import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/eligibility/application/ServerPublicEligibilitySelfCheckService",
  () => ({
    evaluatePublicEligibilitySelfCheck: vi.fn(),
    getPublicEligibilitySelfCheck: vi.fn(),
  }),
);

import * as route from "@/app/api/public/eligibility-self-checks/[fundingCallId]/route";
import {
  evaluatePublicEligibilitySelfCheck,
  getPublicEligibilitySelfCheck,
} from "@/modules/eligibility/application/ServerPublicEligibilitySelfCheckService";

const fundingCallId = "00000000-0000-4000-8000-000000000042";
const token = "a".repeat(64);

beforeEach(() => vi.clearAllMocks());

describe("public eligibility self-check route", () => {
  it("loads questions without authentication", async () => {
    vi.mocked(getPublicEligibilitySelfCheck).mockResolvedValue({
      advisory: true,
      configurationToken: token,
      fundingCall: {
        applicationsOpen: true,
        id: fundingCallId,
        slug: "growth-fund",
        title: "Growth Fund",
      },
      questions: [],
    });

    const response = await route.GET(
      new Request(`http://localhost/api/public/eligibility-self-checks/${fundingCallId}`),
      { params: Promise.resolve({ fundingCallId }) },
    );

    expect(response.status).toBe(200);
    expect(getPublicEligibilitySelfCheck).toHaveBeenCalledWith(fundingCallId);
  });

  it("evaluates submitted answers without an application", async () => {
    const questionId = "b".repeat(32);
    const input = {
      answers: { [questionId]: ["khomas", "oshana"] },
      configurationToken: token,
    };
    vi.mocked(evaluatePublicEligibilitySelfCheck).mockResolvedValue({
      advisory: true,
      applicationsOpen: true,
      disclaimer: "Advisory only.",
      fundingCallId,
      guidance: [],
      outcome: "likely-eligible",
    });

    const response = await route.POST(
      new Request(
        `http://localhost/api/public/eligibility-self-checks/${fundingCallId}`,
        {
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      ),
      { params: Promise.resolve({ fundingCallId }) },
    );

    expect(response.status).toBe(200);
    expect(evaluatePublicEligibilitySelfCheck).toHaveBeenCalledWith(
      fundingCallId,
      input,
    );
  });
});
