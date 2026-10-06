import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AboutContent } from "@/modules/content/ui/public/AboutContent";
import { ContentBlocks } from "@/modules/content/ui/public/ContentBlocks";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getPage } from "@/modules/content/ServerContentQueries";


export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return page ? contentMetadata(page) : {};
}

export default async function AboutPage() {
  const page = await getPage("about");
  if (!page) {
    notFound();
  }

  return (
    <>
      <AboutContent page={page} />
      <ContentBlocks blocks={page.blocks} />
    </>
  );
}
