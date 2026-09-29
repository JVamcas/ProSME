import { GeneralButtonLink } from "@/components/ui/button";
import type {
  PublicFundingCallPage,
  PublicFundingCallStatus,
} from "../../api/PublicFundingCallTransport";
import { PublicFundingCallCard } from "./PublicFundingCallCard";
import { publicFundingHref } from "./PublicFundingCallLinks";

const filters = [
  { label: "All calls", status: undefined },
  { label: "Open", status: "open" },
  { label: "Upcoming", status: "upcoming" },
  { label: "Closed", status: "closed" },
] as const;

export function PublicFundingCallList({
  calls,
  status,
}: {
  calls: PublicFundingCallPage;
  status?: PublicFundingCallStatus;
}) {
  const nextParams = new URLSearchParams();
  if (status) nextParams.set("status", status);
  if (calls.nextCursor) nextParams.set("after", calls.nextCursor);
  return (
    <section
      aria-labelledby="funding-calls-heading"
      className="container pb-10"
    >
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2
          className="text-2xl font-bold text-brand-navy"
          id="funding-calls-heading"
        >
          Available funding calls
        </h2>
        <nav aria-label="Filter funding calls" className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <GeneralButtonLink
              aria-current={status === filter.status ? "page" : undefined}
              className="min-h-11 rounded-lg px-3"
              href={
                filter.status
                  ? `${publicFundingHref}?status=${filter.status}`
                  : publicFundingHref
              }
              key={filter.label}
              size="sm"
              variant={status === filter.status ? "navy" : "outline"}
            >
              {filter.label}
            </GeneralButtonLink>
          ))}
        </nav>
      </div>
      <div className="grid gap-4">
        {calls.items.map((call) => (
          <PublicFundingCallCard call={call} key={call.id} />
        ))}
      </div>
      {!calls.items.length ? (
        <p className="rounded-xl border border-brand-blue/25 bg-brand-blue/5 p-6 text-brand-navy/70">
          {status
            ? `There are no ${status} funding calls at the moment.`
            : "No funding calls have been published yet. Please check back soon."}
        </p>
      ) : null}
      {calls.nextCursor ? (
        <GeneralButtonLink
          className="mt-5 min-h-11 rounded-lg"
          href={`${publicFundingHref}?${nextParams}`}
          variant="outline"
        >
          Next calls
        </GeneralButtonLink>
      ) : null}
    </section>
  );
}
