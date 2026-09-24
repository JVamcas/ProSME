// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortalNavList } from "@/components/layout/portal-nav-list";
import { operationsPortalRoutes } from "@/components/layout/portal-navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

afterEach(() => {
  document.body.replaceChildren();
});

describe("portal navigation list", () => {
  it("keeps nested routes closed by default and toggles them from the parent", async () => {
    const administration = operationsPortalRoutes.find(
      (route) => route.id === "admin-settings",
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PortalNavList dark routes={[administration!]} />);
    });

    const toggle = container.querySelector<HTMLButtonElement>("button");
    const childListId = toggle?.getAttribute("aria-controls");

    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(childListId).toContain("admin-settings-children");
    expect(document.getElementById(childListId!)).toBeNull();
    expect(container.textContent).not.toContain("Workflow Templates");

    await act(async () => {
      toggle?.click();
    });

    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(childListId!)).not.toBeNull();
    expect(container.textContent).toContain("Workflow Templates");

    await act(async () => {
      toggle?.click();
    });

    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(childListId!)).toBeNull();

    await act(async () => root.unmount());
  });
});
