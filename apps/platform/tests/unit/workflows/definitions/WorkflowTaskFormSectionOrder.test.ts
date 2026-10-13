import { describe, expect, it } from "vitest";
import { orderTaskFormSections } from "@/modules/workflows/domain/definitions/WorkflowTaskFormSectionOrder";
import { validateTaskConfiguration } from "@/modules/workflows/WorkflowTaskRegistry";
import { runtimeDefinition } from "../../../support/form-runtime";

describe("task form step order", () => {
  it("orders known sections, ignores removed sections and appends new ones without mutating the form", () => {
    const definition = runtimeDefinition();
    const section = definition.sections[0];
    definition.sections = [
      { ...section, id: "checklist", order: 1 },
      { ...section, id: "documents", order: 2 },
      { ...section, id: "new", order: 3 },
    ];
    const ordered = orderTaskFormSections(definition, {
      formSectionOrder: ["removed", "documents", "checklist"],
    });
    expect(ordered.sections.map((item) => item.id)).toEqual(["documents", "checklist", "new"]);
    expect(ordered.sections.map((item) => item.order)).toEqual([1, 2, 3]);
    expect(definition.sections[0].id).toBe("checklist");
    expect(ordered.fields).toBe(definition.fields);
  });

  it("rejects duplicate and invalid step identifiers", () => {
    for (const formSectionOrder of [["same", "same"], [""], [1]]) {
      expect(validateTaskConfiguration({ formSectionOrder }).success).toBe(false);
    }
    expect(validateTaskConfiguration({ formSectionOrder: ["documents", "checklist"] }).success).toBe(true);
  });
});
