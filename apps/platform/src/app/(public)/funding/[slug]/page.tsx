import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPageHeader } from "@/components/public/public-page-header";
import { findPublicFundingCallBySlug } from "@/modules/funding-calls/application/ServerPublicFundingCallService";
import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const call = await findPublicFundingCallBySlug((await params).slug);
  return call ? { description: call.summary, title: call.title } : {};
}

export default async function FundingCallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const call = await findPublicFundingCallBySlug((await params).slug);
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
            {call.eligibilitySummary ? (
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h2 className="text-xl font-bold text-brand-navy">
                  Eligibility summary
                </h2>
                <p className="mt-3 leading-7 text-slate-700">
                  {call.eligibilitySummary}
                </p>
              </div>
            ) : null}
          </article>
          <aside className="card h-fit p-6">
            <h2 className="font-bold text-navy">Call information</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{dates}</p>
            <p className="mt-3 font-bold text-brand-navy">
              N${call.minimumAmount?.toLocaleString()}–N$
              {call.maximumAmount?.toLocaleString()}
            </p>
            <p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
              {call.applicationsOpen
                ? "Applications are currently open for this call."
                : "Applications are not currently open for this call."}
            </p>
            {call.publicContact.email ? (
              <a
                className="mt-5 block text-sm font-semibold text-brand-navy underline"
                href={`mailto:${call.publicContact.email}`}
              >
                {call.publicContact.name ?? call.publicContact.email}
              </a>
            ) : null}
            {call.publicDocuments.length ? (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <h2 className="font-bold text-brand-navy">Documents</h2>
                <ul className="mt-3 grid gap-2 text-sm">
                  {call.publicDocuments.map((document) => (
                    <li key={document.url}>
                      <a
                        className="font-semibold text-brand-navy underline"
                        href={document.url}
                      >
                        {document.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}
