import { describe, expect, it } from "vitest";
import {
  orderTaskSections,
  taskSectionOrder,
  workflowTaskSectionIds,
} from "@/modules/workflows/domain/definitions/WorkflowTaskSectionOrder";
import { validateTaskConfiguration } from "@/modules/workflows/WorkflowTaskRegistry";

describe("saved task section order", () => {
  it("preserves the existing order for definitions without an order", () => {
    expect(taskSectionOrder({})).toEqual(workflowTaskSectionIds);
  });

  it("keeps configured order and appends newly enabled sections", () => {
    const order = taskSectionOrder({ sectionOrder: ["documents", "form", "checklist"] });
    expect(order).toEqual(["documents", "form", "checklist", "scoring", "comments"]);
    expect(orderTaskSections([
      { id: "checklist", title: "Checklist" },
      { id: "comments", title: "Comments" },
      { id: "documents", title: "Documents" },
    ], order).map((item) => item.id)).toEqual(["documents", "checklist", "comments"]);
  });

  it.each([
    ["form", "form"],
    ["unknown"],
    ["documents", "form", "checklist", "scoring", "comments", "form"],
  ])("rejects invalid saved order: %j", (...sectionOrder) => {
    expect(validateTaskConfiguration({ sectionOrder }).success).toBe(false);
    expect(taskSectionOrder({ sectionOrder })).toEqual(workflowTaskSectionIds);
  });
});
