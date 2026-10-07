import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { ResourceCard } from "@/modules/content/ui/public/ResourceCard";
import { ResourcePagination } from "@/modules/content/ui/public/ResourcePagination";
import { PublicPageHeader } from "@/modules/content/ui/public/PublicPageHeader";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getPage } from "@/modules/content/ServerContentQueries";
import { getResourcePage } from "@/modules/content/ServerResourceCentreService";


export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("resources");
  return page ? contentMetadata(page) : {};
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const [resources, page] = await Promise.all([
    getResourcePage(parameters.page),
    getPage("resources"),
  ]);
  if (resources.page > Math.max(1, resources.totalPages)) notFound();

  return (
    <>
      <PublicPageHeader
        eyebrow="Resource centre"
        image={page?.image}
        title={page?.title ?? ""}
        summary={page?.summary ?? ""}
      />
      <section className="section bg-brand-cream/30">
        <div className="container">
          {resources.items.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {resources.items.map((item) => (
                <ResourceCard item={item} key={item.id} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Resources coming soon"
              message="Approved documents will appear here when they are published."
            />
          )}
          {resources.total > 0 ? <ResourcePagination result={resources} /> : null}
        </div>
      </section>
    </>
  );
}
