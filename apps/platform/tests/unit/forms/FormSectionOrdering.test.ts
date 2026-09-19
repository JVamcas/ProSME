import { describe, expect, it } from "vitest";

import {
  formSectionIdentity,
  moveFormSection,
} from "@/modules/forms/domain/FormSectionOrdering";

const sections = [
  {
    columnSpan: 1 as const,
    description: "First",
    key: "FIRST",
    order: 1,
    showContainer: true,
    title: "First",
  },
  {
    columnSpan: 2 as const,
    description: "Second",
    key: "SECOND",
    order: 2,
    showContainer: false,
    title: "Second",
  },
  {
    columnSpan: 3 as const,
    description: "Third",
    key: "THIRD",
    order: 3,
    showContainer: true,
    title: "Third",
  },
];

describe("form section ordering", () => {
  it("moves a section and assigns contiguous persisted order", () => {
    expect(moveFormSection(
      sections,
      formSectionIdentity(sections[2]),
      formSectionIdentity(sections[0]),
    )).toEqual([
      { ...sections[2], order: 1 },
      { ...sections[0], order: 2 },
      { ...sections[1], order: 3 },
    ]);
  });

  it("does not change the collection for an unknown section", () => {
    expect(moveFormSection(
      sections,
      "section:UNKNOWN",
      formSectionIdentity(sections[0]),
    )).toBe(sections);
  });
});
