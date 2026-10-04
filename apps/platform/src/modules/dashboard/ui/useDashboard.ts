"use client";

import { useQuery } from "@tanstack/react-query";

import { clientDashboardService } from "../ClientDashboardService";
import type { AdminDashboardPeriod } from "../AdminDashboardTypes";

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  staff: (period: AdminDashboardPeriod) =>
    ["dashboard", "staff", period] as const,
  applicant: ["dashboard", "applicant"] as const,
};

export function useStaffDashboard(period: AdminDashboardPeriod) {
  return useQuery({
    queryKey: dashboardQueryKeys.staff(period),
    queryFn: ({ signal }) => clientDashboardService.getStaff(period, signal),
  });
}

export function useApplicantDashboard() {
  return useQuery({
    queryKey: dashboardQueryKeys.applicant,
    queryFn: ({ signal }) => clientDashboardService.getApplicant(signal),
  });
}
