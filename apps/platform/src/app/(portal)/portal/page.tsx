import type { Metadata } from "next";
import { ApplicantDashboardPage } from "@/modules/dashboard/ui/DashboardPages";

export const metadata: Metadata = { title: "Applicant dashboard" };

export default function PortalPage() {
  return <ApplicantDashboardPage />;
}
