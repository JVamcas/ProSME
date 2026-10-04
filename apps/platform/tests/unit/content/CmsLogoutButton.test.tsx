// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import CmsLogoutButton from "@/modules/content/ui/admin/CmsLogoutButton";

const actions = vi.hoisted(() => ({
  logout: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: actions.refresh, replace: actions.replace }),
}));

vi.mock("@/platform/auth/firebase/ClientAuthService", () => ({
  authClientService: { logout: actions.logout },
}));

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("CMS logout", () => {
  it("clears the session before returning to sign-in", async () => {
    actions.logout.mockResolvedValue(undefined);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<CmsLogoutButton />));
    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(actions.logout).toHaveBeenCalledOnce();
    expect(actions.replace).toHaveBeenCalledWith("/sign-in");
    expect(actions.refresh).toHaveBeenCalledOnce();

    await act(async () => root.unmount());
  });

  it("keeps the user in place and explains a sign-out failure", async () => {
    actions.logout.mockRejectedValue(new Error("Sign-out failed"));
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<CmsLogoutButton />));
    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(actions.replace).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Please try again",
    );

    await act(async () => root.unmount());
  });
});
