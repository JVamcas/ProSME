import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { AdminDashboard } from "@/components/admin/dashboard/AdminDashboard";
import { adminDashboardPeriods } from "@/modules/dashboard/AdminDashboardTypes";
import { getAdminDashboard } from "@/modules/dashboard/ServerAdminDashboardService";

const periodSchema = z.enum(adminDashboardPeriods).catch("30");

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/admin");
  const period = periodSchema.parse((await searchParams).period);
  return <AdminDashboard dashboard={await getAdminDashboard(user, period)} />;
}
