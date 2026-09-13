// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { ProfileWorkspace } from "@/components/applicant/profile/ProfileWorkspace";

afterEach(() => {
  document.body.replaceChildren();
});

describe("profile tabs", () => {
  it("reflects the active tab in the URL", async () => {
    window.history.replaceState(null, "", "/portal/profile?tab=personal");
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProfileWorkspace
          allowedTabIds={["personal", "contact"]}
          defaultTabId="personal"
        >
          <p>Personal panel</p>
          <p>Contact panel</p>
        </ProfileWorkspace>,
      );
    });

    const tabs = container.querySelectorAll<HTMLElement>('[role="tab"]');

    await act(async () => {
      tabs[1]?.click();
    });

    expect(window.location.pathname).toBe("/portal/profile");
    expect(window.location.search).toBe("?tab=contact");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");

    await act(async () => root.unmount());
  });
});
