import { SectionHeading } from "@/components/public/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { getHomeNewsAndResources } from "@/modules/content/ServerContentQueries";
import { ContentListingCard } from "./ContentListingCard";

export async function HomeFunding({
  heading,
  introduction = "Updates, stories and useful materials for Namibian entrepreneurs.",
}: {
  heading: string;
  introduction?: string;
}) {
  const items = await getHomeNewsAndResources();

  return (
    <section className="mx-auto w-[min(1720px,calc(100%-2rem))] py-14 sm:w-[min(1720px,calc(100%-5rem))]">
      <SectionHeading
        title={heading}
        text={introduction}
        link="Browse resources"
        href="/resources"
      />
      {!items.length ? (
        <div className="mt-6">
          <EmptyState
            title="News and resources coming soon"
            message="Published programme updates and application resources will appear here."
          />
        </div>
      ) : null}
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-5">
        {items.map((item) => (
          <ContentListingCard
            item={item}
            key={`${item.kind}-${item.id}`}
            kind={item.kind}
          />
        ))}
      </div>
    </section>
  );
}
