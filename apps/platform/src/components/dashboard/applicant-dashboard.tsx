"use client";

import { Bell } from "lucide-react";
import { useEffect } from "react";

import { useApplicationStore } from "@/store/application-store";
import { ApplicationOverview } from "./application-overview";
import { EmptyApplications } from "./empty-applications";
import { PortalSidebar } from "./portal-sidebar";
import { PortalUpdates } from "./portal-updates";

export function ApplicantDashboard() {
  const { application, documents, reference, submittedAt } = useApplicationStore();

  useEffect(() => {
    void useApplicationStore.persist.rehydrate();
  }, []);

  const name = application.firstName
    ? `${application.firstName} ${application.lastName ?? ""}`
    : "Applicant";

  return (
    <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
      <PortalSidebar name={name} />
      <div className="min-w-0 bg-slate-100 p-5 sm:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-500">Welcome back, {application.firstName || "Applicant"}</p>
            <h1 className="display mt-1 text-3xl font-semibold text-navy">Application overview</h1>
          </div>
          <button aria-label="Notifications" className="relative grid size-10 place-items-center rounded-full border border-slate-200 bg-white">
            <Bell className="size-4 text-slate-600" />
            <span className="absolute right-0 top-0 size-2.5 rounded-full bg-gold" />
          </button>
        </header>
        {!reference ? <EmptyApplications /> : (
          <>
            <ApplicationOverview application={application} documentCount={Object.keys(documents).length} reference={reference} submittedAt={submittedAt} />
            <PortalUpdates reference={reference} />
          </>
        )}
      </div>
    </div>
  );
}
