import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPageHeader } from "@/components/public/public-page-header";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getFundingCall } from "@/modules/content/ServerContentQueries";
import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const call = await getFundingCall((await params).slug);
  return call ? contentMetadata(call) : {};
}

export default async function FundingCallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const call = await getFundingCall((await params).slug);
  if (!call) notFound();
  const formatter = new Intl.DateTimeFormat("en-NA", { dateStyle: "long" });
  const dates = `${formatter.format(new Date(call.opensAt))} – ${formatter.format(new Date(call.closesAt))}`;

  return (
    <>
      <PublicPageHeader
        eyebrow={`${call.status} funding call`}
        summary={call.summary}
        title={call.title}
      />
      <section className="section">
        <div className="container grid gap-8 lg:grid-cols-[1fr_300px]">
          <article className="card p-6">
            <h2 className="text-xl font-bold text-brand-navy">
              About this call
            </h2>
            <SanitizedRichTextContent
              className="mt-4"
              sanitizedHtml={call.description}
            />
          </article>
          <aside className="card h-fit p-6">
            <h2 className="font-bold text-navy">Call information</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{dates}</p>
            <p className="mt-3 font-bold text-brand-navy">
              N${call.minimumAmount?.toLocaleString()}–N$
              {call.maximumAmount?.toLocaleString()}
            </p>
            <p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
              Applications are not currently open for this call.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
