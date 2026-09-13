import type { Metadata } from "next";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { ApplicantDashboard } from "@/components/applicant/dashboard/ApplicantDashboard";
import { createApplicantDashboardSummary } from "@/modules/profiles/ServerProfileService";

export const metadata: Metadata = { title: "Applicant dashboard" };

export default async function PortalPage() {
  const user = await getCurrentUser();
  const dashboard = createApplicantDashboardSummary(user);

  return (
    <section>
      <ApplicantDashboard {...dashboard} />
    </section>
  );
}
