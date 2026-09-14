import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@payload-config", () => ({ default: Promise.resolve({}) }));
vi.mock("payload", () => ({ getPayload: vi.fn() }));

import { getPayload } from "payload";
import { loadPublishedEligibilityRuleSet } from "@/modules/eligibility/ServerEligibilityIntegration";

const find = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPayload).mockResolvedValue({ find } as never);
});

describe("published eligibility rule integration", () => {
  it("builds a stable version from the exact ordered rule snapshot", async () => {
    find.mockResolvedValue({
      docs: [
        {
          description: "Ownership evidence is required.",
          hardStop: true,
          key: "ownership",
          label: "Is the business Namibian owned?",
        },
      ],
    });

    const first = await loadPublishedEligibilityRuleSet();
    const second = await loadPublishedEligibilityRuleSet();

    expect(first.rules).toEqual([{
      hardStop: true,
      help: "Ownership evidence is required.",
      id: "ownership",
      question: "Is the business Namibian owned?",
    }]);
    expect(first.version).toMatch(/^[a-f0-9]{64}$/);
    expect(second.version).toBe(first.version);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      draft: false,
      sort: ["order", "id"],
      where: {
        and: [
          { _status: { equals: "published" } },
          { kind: { equals: "checkerQuestion" } },
        ],
      },
    }));
  });

  it("changes the version when published rule content changes", async () => {
    find.mockResolvedValueOnce({
      docs: [{ description: "First help", hardStop: false, key: "bank", label: "Bank account?" }],
    });
    find.mockResolvedValueOnce({
      docs: [{ description: "Updated help", hardStop: false, key: "bank", label: "Bank account?" }],
    });

    const first = await loadPublishedEligibilityRuleSet();
    const changed = await loadPublishedEligibilityRuleSet();

    expect(changed.version).not.toBe(first.version);
  });
});

