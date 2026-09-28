import { describe, expect, it } from "vitest";

import {
  createReviewDraftPatch,
  mergeReviewDraftPatches,
} from "@/modules/work-queue/ui/ReviewAutosavePatch";

const initial = {
  comments: [{ key: "recommendation", value: "" }],
  documents: [{
    category: "COMMITTEE_PACK",
    comment: "",
    outcome: "" as const,
  }],
  items: [
    { accepted: false, code: "QUORUM", comment: "" },
    { accepted: false, code: "BUDGET", comment: "" },
  ],
  scores: [{ comment: "", criterion: "IMPACT", score: null }],
};

describe("review draft patch", () => {
  it("includes only the checklist entry that changed", () => {
    const patch = createReviewDraftPatch(initial, {
      ...initial,
      items: [
        { accepted: true, code: "QUORUM", comment: "" },
        initial.items[1],
      ],
    });

    expect(patch).toEqual({
      items: [{ accepted: true, code: "QUORUM", comment: "" }],
    });
  });

  it("queues later changes without losing an earlier failed patch", () => {
    const patch = mergeReviewDraftPatches(
      { items: [{ accepted: true, code: "QUORUM" }] },
      {
        comments: [{ key: "recommendation", value: "Approve" }],
        items: [{ accepted: true, code: "BUDGET" }],
      },
    );

    expect(patch).toEqual({
      comments: [{ key: "recommendation", value: "Approve" }],
      items: [
        { accepted: true, code: "QUORUM" },
        { accepted: true, code: "BUDGET" },
      ],
    });
  });

  it("keeps the newest value when the same entry changes twice", () => {
    const patch = mergeReviewDraftPatches(
      { items: [{ accepted: true, code: "QUORUM" }] },
      { items: [{ accepted: false, code: "QUORUM" }] },
    );

    expect(patch).toEqual({
      items: [{ accepted: false, code: "QUORUM" }],
    });
  });
});
