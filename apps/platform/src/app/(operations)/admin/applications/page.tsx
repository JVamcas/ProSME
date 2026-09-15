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
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold text-brand-navy">Applications</h1>
        <p className="mt-1 text-sm text-brand-navy/60">
          Manage and track submitted funding applications.
        </p>
      </header>
      <ApplicationsTable />
    </div>
  );
}
