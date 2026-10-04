import { describe, expect, it } from "vitest";

import { selectLatestHomeItems } from "@/modules/content/HomeFeedSelection";

describe("Home feed selection", () => {
  it("uses publication date or creation date and breaks ties by ID", () => {
    const items = selectLatestHomeItems(
      [
        { id: 1, createdAt: "2026-09-20", publishedAt: "2026-09-28" },
        { id: 2, createdAt: "2026-09-20", publishedAt: "2026-09-27" },
      ],
      [
        { id: 3, createdAt: "2026-09-28", publishedAt: null },
        { id: 4, createdAt: "2026-09-21", publishedAt: null },
      ],
    );

    expect(items.map(({ id }) => id)).toEqual([3, 1]);
  });

  it("does not fill missing items", () => {
    expect(selectLatestHomeItems([], [{ id: 1, createdAt: "2026-09-28" }]))
      .toHaveLength(1);
  });
});
