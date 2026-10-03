import type { Metadata } from "next";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { ApplicantDashboard } from "@/components/applicant/dashboard/ApplicantDashboard";
import { getApplicantDashboard } from "@/modules/dashboard/ServerApplicantDashboardService";

export const metadata: Metadata = { title: "Applicant dashboard" };

export default async function PortalPage() {
  const user = await getAuthenticatedPageUser();
  const dashboard = await getApplicantDashboard(user);

  return (
    <section>
      <ApplicantDashboard {...dashboard} />
    </section>
  );
}
