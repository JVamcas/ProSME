// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { Tabs } from "@/components/ui/tabs";

afterEach(() => {
  document.body.replaceChildren();
});

describe("reusable tabs", () => {
  it("switches panels in place and retains inactive panel content", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <Tabs
          ariaLabel="Account sections"
          defaultSelectedId="personal"
          items={[
            {
              content: <input aria-label="First name" defaultValue="Anna" />,
              id: "personal",
              label: "Personal information",
            },
            {
              content: <p>Business panel</p>,
              id: "business",
              label: "Business information",
            },
          ]}
          orientation="vertical"
        />,
      );
    });

    const tabs = container.querySelectorAll<HTMLElement>('[role="tab"]');
    const personalInput = container.querySelector<HTMLInputElement>(
      '[aria-label="First name"]',
    );

    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");

    await act(async () => {
      tabs[1]?.click();
    });

    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(container.textContent).toContain("Business panel");
    expect(container.querySelector('[aria-label="First name"]')).toBe(
      personalInput,
    );

    await act(async () => root.unmount());
  });
});
