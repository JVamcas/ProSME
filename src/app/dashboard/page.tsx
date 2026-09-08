import type { Metadata } from "next";
import { ApplicantDashboard } from "@/components/dashboard/applicant-dashboard";

export const metadata: Metadata = { title: "Applicant dashboard" };
export default function DashboardPage(){return <section className="bg-slate-100 py-10"><div className="container"><ApplicantDashboard/></div></section>;}
