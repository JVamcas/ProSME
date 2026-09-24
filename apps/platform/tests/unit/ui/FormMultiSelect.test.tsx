// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormMultiSelect } from "@/shared/ui/FormMultiSelect";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.replaceChildren();
});

describe("FormMultiSelect", () => {
  it("uses a checkbox dropdown and reports all selected values", async () => {
    const onChange = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <FormMultiSelect
          id="sectors"
          items={[
            { label: "Agriculture", value: "AGRICULTURE" },
            { label: "Manufacturing", value: "MANUFACTURING" },
          ]}
          onChange={onChange}
          value={["AGRICULTURE"]}
        />,
      );
    });

    const button = document.querySelector<HTMLButtonElement>(
      '[aria-haspopup="listbox"]',
    );
    expect(button?.textContent).toContain("Agriculture");
    await act(async () => button?.click());

    const listbox = document.querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();
    expect(listbox?.getAttribute("aria-multiselectable")).toBe("true");
    const manufacturing = [...document.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    )].find((input) => input.parentElement?.textContent?.includes("Manufacturing"));
    await act(async () => manufacturing?.click());

    expect(onChange).toHaveBeenCalledWith([
      "AGRICULTURE",
      "MANUFACTURING",
    ]);
    await act(async () => root.unmount());
  });
});
