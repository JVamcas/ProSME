import type { Metadata } from "next";

import { FaqContent } from "@/modules/content/ui/public/FaqContent";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getFaqs, getPage } from "@/modules/content/ServerContentQueries";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("faq");
  return page ? contentMetadata(page) : {};
}

export default async function FaqPage() {
  const [faqs, page] = await Promise.all([getFaqs(), getPage("faq")]);
  return <FaqContent page={page} faqs={faqs} />;
}
