import { describe, expect, it } from "vitest";

import { applicationReadSections } from "@/modules/applications/domain/ApplicationReadAnswers";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";

const form: FormRuntimeSchema = {
  fields: [
    {
      columnSpan: 1,
      key: "FUNDING",
      label: "Funding requested",
      order: 2,
      required: true,
      sectionId: "project",
      type: "CURRENCY",
    },
    {
      columnSpan: 1,
      key: "GOAL",
      label: "Project goal",
      order: 1,
      required: true,
      sectionId: "project",
      type: "TEXTAREA",
    },
    {
      columnSpan: 1,
      key: "MARKETS",
      label: "Markets served",
      options: [
        { key: "LOCAL", label: "Local", order: 1 },
        { key: "EXPORT", label: "Export", order: 2 },
      ],
      order: 3,
      required: false,
      sectionId: "project",
      type: "MULTI_SELECT",
    },
    {
      columnSpan: 1,
      key: "CONSENT",
      label: "Declaration accepted",
      order: 1,
      required: true,
      sectionId: "declarations",
      type: "YES_NO",
    },
  ],
  instructions: null,
  sections: [
    {
      columnSpan: 1,
      description: "",
      key: "declarations",
      id: "declarations",
      order: 2,
      showContainer: true,
      title: "Declarations",
    },
    {
      columnSpan: 1,
      description: "",
      key: "project",
      id: "project",
      order: 1,
      showContainer: true,
      title: "Project",
    },
  ],
  submitLabel: "Submit",
  versionId: "10000000-0000-4000-8000-000000000001",
  versionNumber: 1,
};

describe("application read answers", () => {
  it("renders every captured dynamic answer in its versioned section and field order", () => {
    expect(applicationReadSections(form, {
      CONSENT: false,
      FUNDING: 850000,
      GOAL: "Expand production",
      MARKETS: ["LOCAL", "EXPORT"],
    })).toEqual([
      {
        key: "project",
        title: "Project",
        answers: [
          { key: "GOAL", label: "Project goal", value: "Expand production" },
          { key: "FUNDING", label: "Funding requested", value: "N$ 850,000" },
          { key: "MARKETS", label: "Markets served", value: "Local, Export" },
        ],
      },
      {
        key: "declarations",
        title: "Declarations",
        answers: [
          { key: "CONSENT", label: "Declaration accepted", value: "No" },
        ],
      },
    ]);
  });

  it("omits unanswered fields without losing false or zero values", () => {
    const sections = applicationReadSections(form, {
      CONSENT: false,
      FUNDING: 0,
      GOAL: "",
      MARKETS: [],
    });
    expect(sections.map((section) => section.answers)).toEqual([
      [{ key: "FUNDING", label: "Funding requested", value: "N$ 0" }],
      [{ key: "CONSENT", label: "Declaration accepted", value: "No" }],
    ]);
  });
});
