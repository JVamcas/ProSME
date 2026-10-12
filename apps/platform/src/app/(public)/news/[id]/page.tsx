import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewsArticleContent } from "@/modules/content/ui/public/NewsArticleContent";
import { PublicPageHeader } from "@/modules/content/ui/public/PublicPageHeader";
import { getNewsArticle } from "@/modules/content/ServerNewsService";
import { contentMetadata } from "@/modules/content/ContentMetadata";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getNewsArticle((await params).id);
  return item ? contentMetadata(item) : {};
}

export default async function NewsDetailPage({ params }: Props) {
  const item = await getNewsArticle((await params).id);
  if (!item?.body) notFound();

  return (
    <>
      <PublicPageHeader
        eyebrow="News"
        image={item.image}
        title={item.title}
        summary={item.summary}
      />
      <article className="section">
        <div className="container max-w-6xl">
          <NewsArticleContent data={item.body} />
        </div>
      </article>
    </>
  );
}
