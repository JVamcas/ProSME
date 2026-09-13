import type { Metadata } from "next";

import { CmsRichText } from "@/components/public/cms-rich-text";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getFaqs, getPage } from "@/modules/content/ServerContentQueries";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const page = await getPage("faq"); return page ? contentMetadata(page) : {}; }

export default async function FaqPage() {
  const [faqs, page] = await Promise.all([getFaqs(), getPage("faq")]);
  return <><PublicPageHeader eyebrow="Help centre" image={page?.image} title={page?.title ?? ""} summary={page?.summary ?? ""} /><section className="section bg-slate-50"><div className="container max-w-4xl space-y-3">{faqs.map((faq) => <details className="group rounded-xl border border-slate-200 bg-white p-5" key={faq.id}><summary className="list-none pr-8 text-base font-bold text-navy marker:hidden">{faq.question}<span className="float-right text-2xl text-brand-navy group-open:rotate-45">+</span></summary><div className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600"><CmsRichText data={faq.answer} /></div></details>)}</div></section></>;
}
