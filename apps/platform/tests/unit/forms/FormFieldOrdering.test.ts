import { describe, expect, it } from "vitest";

import {
  formFieldIdentity,
  moveFormField,
  removeFormField,
} from "@/modules/forms/domain/FormFieldOrdering";
import type { FormField } from "@/modules/forms/FormTypes";

const firstSectionId = "10000000-0000-4000-8000-000000000001";
const secondSectionId = "10000000-0000-4000-8000-000000000002";
const fields: FormField[] = [
  {
    columnSpan: 1,
    key: "FIRST",
    label: "First",
    order: 1,
    required: false,
    sectionId: firstSectionId,
    type: "TEXT",
  },
  {
    columnSpan: 1,
    key: "SECOND",
    label: "Second",
    order: 2,
    required: false,
    sectionId: firstSectionId,
    type: "TEXT",
  },
  {
    columnSpan: 1,
    key: "THIRD",
    label: "Third",
    order: 1,
    required: false,
    sectionId: secondSectionId,
    type: "TEXT",
  },
];

describe("form field ordering", () => {
  it("reorders fields within a section", () => {
    const reordered = moveFormField(
      fields,
      formFieldIdentity(fields[1]),
      firstSectionId,
      formFieldIdentity(fields[0]),
    );
    expect(reordered.map((field) => [field.key, field.order])).toEqual([
      ["SECOND", 1],
      ["FIRST", 2],
      ["THIRD", 1],
    ]);
  });

  it("moves a field downward within a section", () => {
    const reordered = moveFormField(
      fields,
      formFieldIdentity(fields[0]),
      firstSectionId,
      formFieldIdentity(fields[1]),
    );
    expect(reordered.map((field) => [field.key, field.order])).toEqual([
      ["SECOND", 1],
      ["FIRST", 2],
      ["THIRD", 1],
    ]);
  });

  it("moves fields between sections and normalises both orders", () => {
    const reordered = moveFormField(
      fields,
      formFieldIdentity(fields[0]),
      secondSectionId,
    );
    expect(reordered.map((field) => [
      field.key,
      field.sectionId,
      field.order,
    ])).toEqual([
      ["SECOND", firstSectionId, 1],
      ["THIRD", secondSectionId, 1],
      ["FIRST", secondSectionId, 2],
    ]);
  });

  it("normalises order after deleting a field", () => {
    expect(removeFormField(
      fields,
      formFieldIdentity(fields[0]),
    ).map((field) => [field.key, field.order])).toEqual([
      ["SECOND", 1],
      ["THIRD", 1],
    ]);
  });
});
