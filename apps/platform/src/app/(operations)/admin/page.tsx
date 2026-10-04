import { dashboardPeriodSchema } from "@/modules/dashboard/api/DashboardSchemas";
import { StaffDashboardPage } from "@/modules/dashboard/ui/DashboardPages";

export default async function AdminPage({ searchParams }: {
  searchParams: Promise<{ period?: string }>;
}) {
  const period = dashboardPeriodSchema.catch("30").parse((await searchParams).period);
  return <StaffDashboardPage period={period} />;
}
