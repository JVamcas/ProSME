"use client";

import { useQueryClient } from "@tanstack/react-query";
import { clientDashboardService } from "../ClientDashboardService";
import { dashboardQueryKeys } from "./useDashboard";

export function useDashboardNavigation(audience: "staff" | "applicant") {
  const client = useQueryClient();
  return (href: string) => {
    // Start only the selected same-portal read, using the destination's query.
    if (audience === "staff" && href === "/admin") {
      void client.prefetchQuery({
        queryKey: dashboardQueryKeys.staff("30"),
        queryFn: ({ signal }) => clientDashboardService.getStaff("30", signal),
      });
    }
    if (audience === "applicant" && href === "/portal") {
      void client.prefetchQuery({
        queryKey: dashboardQueryKeys.applicant,
        queryFn: ({ signal }) => clientDashboardService.getApplicant(signal),
      });
    }
  };
}
