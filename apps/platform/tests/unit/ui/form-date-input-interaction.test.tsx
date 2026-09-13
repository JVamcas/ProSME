// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { FormDateInput } from "@/components/ui/form-date-input";

afterEach(() => {
  document.body.replaceChildren();
});

describe("form date input", () => {
  it("opens an accessible calendar popover", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<FormDateInput label="Date of birth" name="dateOfBirth" />);
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      '[aria-label="Open calendar"]',
    );

    await act(async () => {
      trigger?.click();
    });

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Clear");
    expect(document.body.textContent).toContain("Today");

    await act(async () => root.unmount());
  });
});
