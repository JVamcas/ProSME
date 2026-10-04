// @vitest-environment happy-dom

import { QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

vi.mock("@/modules/dashboard/ClientDashboardService", () => ({
  clientDashboardService: { getStaff: vi.fn(), getApplicant: vi.fn() },
}));

import { clientDashboardService } from "@/modules/dashboard/ClientDashboardService";
import { useDashboardNavigation } from "@/modules/dashboard/ui/useDashboardNavigation";
import { createQueryClient } from "@/shared/utils/createQueryClient";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("shares one selected dashboard request with the destination cache and skips cross-portal reads", async () => {
  const client = createQueryClient();
  const data = {
    activities: [],
    metrics: {
      totalApplications: 1,
      underReview: 0,
      pendingDecision: 0,
      informationRequests: 0,
    },
    period: "30" as const,
    statuses: [],
    visibility: "all" as const,
  };
  vi.mocked(clientDashboardService.getStaff).mockResolvedValue(data);
  function Navigation() {
    const prepare = useDashboardNavigation("staff");
    return (
      <button
        onClick={() => {
          prepare("/portal");
          prepare("/admin");
          prepare("/admin");
        }}
      >
        Navigate
      </button>
    );
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Navigation />
      </QueryClientProvider>,
    ),
  );
  await act(async () => container.querySelector("button")?.click());
  expect(clientDashboardService.getStaff).toHaveBeenCalledOnce();
  expect(clientDashboardService.getApplicant).not.toHaveBeenCalled();
  expect(client.getQueryData(["dashboard", "staff", "30"])).toEqual(data);
  await act(async () => root.unmount());
  client.clear();
});
