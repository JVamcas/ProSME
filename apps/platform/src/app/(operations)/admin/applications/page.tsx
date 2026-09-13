import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { ApplicationsTable } from "@/components/admin/applications/ApplicationsTable";

export const metadata: Metadata = {
  title: "Applications",
};

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  const canRead =
    can(user, capabilities.applicationReadAssigned) ||
    can(user, capabilities.applicationReadAll);

  if (!canRead) {
    redirect("/unauthorized");
  }

  return (
    <div className="mx-auto max-w-[1240px] p-4 sm:p-7 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Applications</h1>
        <p className="mt-1 text-xs text-slate-400">
          Search and review submitted applications.
        </p>
      </div>
      <ApplicationsTable />
    </div>
  );
}
