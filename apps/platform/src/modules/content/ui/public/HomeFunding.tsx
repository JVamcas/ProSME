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
  const { news, resources } = await getHomeNewsAndResources();
  const items = [
    ...news.map((item) => ({
      ...item,
      kind: "news" as const,
    })),
    ...resources.map((item) => ({
      ...item,
      kind: "resource" as const,
    })),
  ];

  return (
    <section className="container py-14">
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
      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <ContentListingCard
            item={item}
            key={`${item.kind}-${item.slug}`}
            kind={item.kind}
          />
        ))}
      </div>
    </section>
  );
}
