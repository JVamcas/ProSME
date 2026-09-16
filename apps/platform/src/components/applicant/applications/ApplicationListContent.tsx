
import { EditButton } from "@/components/ui/action-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import type { ApplicationSummary } from "@/modules/applications/ApplicationTypes";
import { useRouter } from "next/router";
import { ApplicationCards, ApplicationsTable } from "./ApplicationTable";

function renderAction(application: ApplicationSummary) {
  const router = useRouter();

  return (
    <>
      <EditButton
        disabled={application.status !== "draft"}
        onClick={() => {
          router.push(`/portal/applications/${application.id}/edit`);
        }}
      />
    </>
  );
}

export function ApplicationListContent({
  items,
}: {
  items: ApplicationSummary[];
}) {
  if (!items.length) {
    return (
      <EmptyState
        title="No applications yet"
        message="Choose an open funding opportunity to start an application."
      />
    );
  }

  return (
    <>
      <ApplicationsTable items={items} renderAction={renderAction} />
      <ApplicationCards items={items} renderAction={renderAction} />
    </>
  );
}
