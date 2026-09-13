import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CmsRichText } from "@/components/ui/cms-rich-text";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { getFundingCalls } from "@/modules/content/ServerContentQueries";
import { contentMetadata } from "@/modules/content/ContentMetadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const call = (await getFundingCalls()).find((item) => item.slug === slug);
  return call ? contentMetadata(call) : {};
}

export default async function FundingCallPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const call = (await getFundingCalls()).find((item) => item.slug === slug);
  if (!call) notFound();
  const dates = `${new Intl.DateTimeFormat("en-NA", { dateStyle: "long" }).format(new Date(call.opensAt))} – ${new Intl.DateTimeFormat("en-NA", { dateStyle: "long" }).format(new Date(call.closesAt))}`;
  return <><PublicPageHeader eyebrow={`${call.status} funding call`} image={call.image} title={call.title} summary={call.summary} /><section className="section"><div className="container grid gap-8 lg:grid-cols-[1fr_300px]"><article className="cms-rich-text"><CmsRichText data={call.eligibility} /></article><aside className="card h-fit p-6"><h2 className="font-bold text-navy">Call information</h2><p className="mt-3 text-sm leading-6 text-slate-600">{dates}</p>{call.minimumAmount && call.maximumAmount ? <p className="mt-3 font-bold text-brand-navy">N${call.minimumAmount.toLocaleString()}–N${call.maximumAmount.toLocaleString()}</p> : null}{call.status === "open" && call.applicationUrl ? <Link href={call.applicationUrl} className="home-primary mt-5 w-full">Apply Now</Link> : <p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">Applications are not currently open for this call.</p>}</aside></div></section></>;
}
