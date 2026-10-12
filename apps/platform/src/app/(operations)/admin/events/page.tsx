import Link from "next/link";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getOperationsEventPage } from "@/modules/content/application/ServerEventOperationsService";
import { EmptyState } from "@/shared/ui/EmptyState";
import { formatLocalDateTime24 } from "@/lib/dateUtils";

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
    <main className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-navy">Events</h1>
      <div className="grid gap-4">
        {result.items.map((event) => (
          <Link
            className="rounded-xl border border-slate-200 bg-white p-5 focus-visible:ring-2 focus-visible:ring-brand-orange"
            href={`/admin/events/${event.id}`}
            key={event.id}
          >
            <h2 className="text-xl font-bold">{event.title}</h2>
            <p className="mt-2 text-slate-600">
              {formatLocalDateTime24(event.startsAt, "—", event.timezone)} ·{" "}
              {event.location}
            </p>
          </Link>
        ))}
        {!result.items.length ? (
          <EmptyState
            title="No events"
            message="Create event content in CMS to manage registrations here."
          />
        ) : null}
      </div>
      <nav aria-label="Events pagination" className="flex gap-6">
        {result.page > 1 ? (
          <Link href={`/admin/events?page=${result.page - 1}`}>Previous</Link>
        ) : null}
        {result.page * result.pageSize < result.total ? (
          <Link href={`/admin/events?page=${result.page + 1}`}>Next</Link>
        ) : null}
      </nav>
    </main>
  );
}
