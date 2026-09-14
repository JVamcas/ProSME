import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { GeneralButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ApplicationSummary } from "@/modules/applications/ApplicationTypes";
import { ApplicationCards, ApplicationsTable } from "./ApplicationTable";

function ContinueLink({ application }: { application: ApplicationSummary }) {
  return (
    <GeneralButton asChild size="sm" variant="outline">
      <Link href={`/portal/applications/${application.id}/edit`}>
        Continue
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </GeneralButton>
  );
}

function renderAction(application: ApplicationSummary) {
  return <ContinueLink application={application} />;
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
