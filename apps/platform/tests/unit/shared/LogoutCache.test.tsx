// @vitest-environment happy-dom

import { QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/platform/auth/firebase/ClientAuthService", () => ({
  authClientService: { logout: vi.fn() },
}));

import { authClientService } from "@/platform/auth/firebase/ClientAuthService";
import { useLogout } from "@/platform/auth/ui/useLogout";
import { createQueryClient } from "@/shared/utils/createQueryClient";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("clears protected caches before logout transport, including when logout fails", async () => {
  const client = createQueryClient();
  client.setQueryData(["dashboard", "applicant"], { sensitive: "private" });
  vi.mocked(authClientService.logout).mockImplementation(async () => {
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    throw new Error("Synthetic network failure");
  });
  function Logout() {
    const logout = useLogout();
    return <button onClick={() => logout.mutate()}>Logout</button>;
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Logout />
      </QueryClientProvider>,
    ),
  );
  await act(async () => container.querySelector("button")?.click());
  expect(authClientService.logout).toHaveBeenCalledOnce();
  expect(client.getQueryData(["dashboard", "applicant"])).toBeUndefined();
  await act(async () => root.unmount());
});
