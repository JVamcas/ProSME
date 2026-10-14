// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { FormFieldDialog } from "@/modules/forms/ui/builder/FormFieldDialog";
import type { FormField } from "@/modules/forms/FormTypes";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const base: FormField = {
  key: "SCORE_ONE",
  label: "First score",
  type: "SCORE",
  sectionId: "a0000000-0000-4000-8000-000000000002",
  columnSpan: 1,
  order: 1,
  required: false,
};
const scores = [base, { ...base, key: "SCORE_TWO", label: "Second score" }];
const aggregate: FormField = {
  ...base,
  key: "TOTAL",
  label: "Total score",
  type: "SCORING_AGGREGATE",
  scoringAggregate: {
    method: "WEIGHTED_AVERAGE",
    missing: "REQUIRE_ALL",
    normalization: "RAW",
    precision: 2,
    sources: [{ fieldKey: "SCORE_ONE", weight: 3 }],
  },
};

async function mount(field?: FormField) {
  const save = vi.fn().mockResolvedValue(undefined);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <FormFieldDialog
        isOpen
        field={field}
        fields={scores}
        nextOrder={3}
        onClose={vi.fn()}
        onSave={save}
        sectionColumnSpan={3}
        sectionId={base.sectionId}
      />,
    ),
  );
  return {
    save,
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}
async function button(text: string) {
  await act(async () =>
    Array.from(document.querySelectorAll("button"))
      .find((item) => item.textContent === text)!
      .click(),
  );
}
async function toggle(label: string) {
  if (!document.querySelector('[role="listbox"]')) {
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>("#aggregate-score-sources")!
        .click(),
    );
  }
  const option = Array.from(document.querySelectorAll('[role="option"]')).find(
    (item) => item.textContent === label,
  )!;
  await act(async () =>
    option.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
}

describe("field setup steps", () => {
  it("blocks advancing with missing details and does not save on the first step", async () => {
    const view = await mount();
    try {
      expect(
        document.querySelector('[aria-label="Field setup progress"]'),
      ).not.toBeNull();
      expect(document.querySelector('[name="helpText"]')).toBeNull();
      await button("Next");
      expect(document.querySelector('[name="label"]')).not.toBeNull();
      expect(
        document.querySelector('[name="label"]')!.getAttribute("aria-invalid"),
      ).toBe("true");
      expect(view.save).not.toHaveBeenCalled();
    } finally {
      await view.cleanup();
    }
  });

  it("retains details, selected sources and existing weights across steps and saves new sources with weight one", async () => {
    const view = await mount(aggregate);
    try {
      await button("Next");
      expect(view.save).not.toHaveBeenCalled();
      expect(document.body.textContent).not.toContain("Add score source");
      expect(document.body.textContent).not.toContain("Remove source");
      await toggle("Second score");
      await button("Back");
      expect(
        document.querySelector<HTMLInputElement>('[name="label"]')!.value,
      ).toBe("Total score");
      await button("Next");
      expect(
        document.querySelector<HTMLInputElement>(
          '[name="scoringAggregate.sources.0.weight"]',
        )!.value,
      ).toBe("3");
      await button("Save field");
      expect(view.save).toHaveBeenCalledWith(
        expect.objectContaining({
          scoringAggregate: {
            ...aggregate.scoringAggregate,
            sources: [
              { fieldKey: "SCORE_ONE", weight: 3 },
              { fieldKey: "SCORE_TWO", weight: 1 },
            ],
          },
        }),
      );
    } finally {
      await view.cleanup();
    }
  });

  it("requires at least one source and removes deselected sources for unweighted calculations", async () => {
    const view = await mount({
      ...aggregate,
      scoringAggregate: { ...aggregate.scoringAggregate!, method: "AVERAGE" },
    });
    try {
      await button("Next");
      expect(
        document.querySelector('[name="scoringAggregate.sources.0.weight"]'),
      ).toBeNull();
      await toggle("First score");
      await button("Save field");
      expect(view.save).not.toHaveBeenCalled();
      expect(
        document
          .querySelector("#aggregate-score-sources")!
          .getAttribute("aria-invalid"),
      ).toBe("true");
      await toggle("Second score");
      await button("Save field");
      expect(view.save).toHaveBeenCalledWith(
        expect.objectContaining({
          scoringAggregate: expect.objectContaining({
            sources: [{ fieldKey: "SCORE_TWO", weight: 1 }],
          }),
        }),
      );
    } finally {
      await view.cleanup();
    }
  });
});
