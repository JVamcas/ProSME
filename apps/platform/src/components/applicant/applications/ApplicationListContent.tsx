"use client";

import { useRouter } from "next/navigation";

import { EditButton } from "@/components/ui/action-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import type { ApplicationSummary } from "@/modules/applications/ApplicationTypes";
import { ApplicationCards, ApplicationsTable } from "./ApplicationTable";

function renderAction(
  application: ApplicationSummary,
  onEdit: (applicationId: string) => void,
) {
  return (
    <EditButton
      disabled={application.status !== "draft"}
      onClick={() => onEdit(application.id)}
    />
  );
}

export function ApplicationListContent({
  items,
}: {
  items: ApplicationSummary[];
}) {
  const router = useRouter();

  if (!items.length) {
    return (
      <EmptyState
        title="No applications yet"
        message="Choose an open funding opportunity to start an application."
      />
    );
  }

  const handleEdit = (applicationId: string) => {
    router.push(`/portal/applications/${applicationId}/edit`);
  };

  const renderApplicationAction = (application: ApplicationSummary) =>
    renderAction(application, handleEdit);

  return (
    <>
      <ApplicationsTable
        items={items}
        renderAction={renderApplicationAction}
      />
      <ApplicationCards
        items={items}
        renderAction={renderApplicationAction}
      />
    </>
  );
}
