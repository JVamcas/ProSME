"use client";

import { z } from "zod";

import { ClientRequestError, requestData } from "@/lib/client-http";
import {
  adminDashboardSchema,
  applicantDashboardSchema,
} from "./api/DashboardSchemas";
import type { AdminDashboardPeriod } from "./AdminDashboardTypes";

async function readDashboard<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
) {
  const response = await requestData<unknown>(path, {
    signal,
    cache: "no-store",
  });
  const parsed = schema.safeParse(response);
  if (!parsed.success) {
    throw new ClientRequestError(
      "Dashboard data could not be read. Please try again.",
      502,
    );
  }
  return parsed.data;
}

export const clientDashboardService = {
  getStaff: (period: AdminDashboardPeriod, signal?: AbortSignal) =>
    readDashboard(
      `/api/dashboard/staff?period=${period}`,
      adminDashboardSchema,
      signal,
    ),
  getApplicant: (signal?: AbortSignal) =>
    readDashboard("/api/dashboard/applicant", applicantDashboardSchema, signal),
};
