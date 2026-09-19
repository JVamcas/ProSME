import { describe, expect, it } from "vitest";

import { moveFormSection } from "@/modules/forms/domain/FormSectionOrdering";

const sections = [
  { description: "First", key: "FIRST", order: 1, title: "First" },
  { description: "Second", key: "SECOND", order: 2, title: "Second" },
  { description: "Third", key: "THIRD", order: 3, title: "Third" },
];

describe("form section ordering", () => {
  it("moves a section and assigns contiguous persisted order", () => {
    expect(moveFormSection(sections, "THIRD", "FIRST")).toEqual([
      { ...sections[2], order: 1 },
      { ...sections[0], order: 2 },
      { ...sections[1], order: 3 },
    ]);
  });

  it("does not change the collection for an unknown section", () => {
    expect(moveFormSection(sections, "UNKNOWN", "FIRST")).toBe(sections);
  });
});
