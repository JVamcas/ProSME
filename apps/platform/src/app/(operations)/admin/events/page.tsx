import Link from "next/link";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getOperationsEventPage } from "@/modules/content/application/ServerEventOperationsService";
import { EmptyState } from "@/shared/ui/EmptyState";
import { PageShell } from "@/shared/ui/PageShell";
import { EventOperationsCard } from "@/modules/content/ui/operations/EventOperationsCard";

export default async function OperationsEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const result = await getOperationsEventPage(
    await getAuthenticatedPageUser(),
    { page: page || 1 },
  );
  return (
    <PageShell
      title="Events"
      description="Manage event registrations and delivery."
    >
      <div className="grid gap-4">
        {result.items.map((event) => (
          <EventOperationsCard event={event} key={event.id} />
        ))}
        {!result.items.length ? (
          <EmptyState
            title="No events"
            message="Create event content in CMS to manage registrations here."
          />
        ) : null}
      </div>
      <nav aria-label="Events pagination" className="mt-6 flex gap-6">
        {result.page > 1 ? (
          <Link href={`/admin/events?page=${result.page - 1}`}>Previous</Link>
        ) : null}
        {result.page * result.pageSize < result.total ? (
          <Link href={`/admin/events?page=${result.page + 1}`}>Next</Link>
        ) : null}
      </nav>
    </PageShell>
  );
}
