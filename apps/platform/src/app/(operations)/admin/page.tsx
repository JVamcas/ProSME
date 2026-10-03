import { z } from "zod";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { AdminDashboard } from "@/modules/dashboard/ui/AdminDashboard";
import { adminDashboardPeriods } from "@/modules/dashboard/AdminDashboardTypes";
import { getAdminDashboard } from "@/modules/dashboard/ServerAdminDashboardService";

const periodSchema = z.enum(adminDashboardPeriods).catch("30");

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getAuthenticatedPageUser();
  const period = periodSchema.parse((await searchParams).period);
  return <AdminDashboard dashboard={await getAdminDashboard(user, period)} />;
}
