import type { Metadata } from "next";
import { ApplicantDashboard } from "@/components/dashboard/applicant-dashboard";

export const metadata: Metadata = { title: "Applicant dashboard" };
export default function DashboardPage() {
  return (
    <section className="min-h-screen bg-slate-100">
      <ApplicantDashboard />
    </section>
  );
}
