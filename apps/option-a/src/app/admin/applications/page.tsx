import type { Metadata } from "next";
import { ApplicationsTable } from "@/components/admin/applications-table";

export const metadata: Metadata = { title: "Applications" };
export default function ApplicationsPage() { return <div className="mx-auto max-w-[1240px] p-4 sm:p-7 lg:p-8"><div className="mb-6"><h1 className="text-2xl font-bold text-navy">Applications</h1><p className="mt-1 text-xs text-slate-400">Search and review submitted applications.</p></div><ApplicationsTable/></div>; }
