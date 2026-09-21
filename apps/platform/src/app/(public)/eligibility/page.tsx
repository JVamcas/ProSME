import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FocusSectors } from "@/components/public/focus-sectors";
import {
  getEligibilityContent,
  getPage,
} from "@/modules/content/ServerContentQueries";
import { eligibilityFocusSection } from "@/modules/content/EligibilityPageContent";
import { PublicEligibilitySelfCheck } from "@/modules/eligibility/ui/self-check/PublicEligibilitySelfCheck";
import { listPublicFundingCalls } from "@/modules/funding-calls/application/ServerPublicFundingCallService";

export const metadata: Metadata = { title: "Eligibility checker" };


export default async function EligibilityPage({
  searchParams,
}: {
  searchParams: Promise<{ fundingCall?: string }>;
}) {
  const requestedSlug = (await searchParams).fundingCall;
  const [content, calls, page] = await Promise.all([
    getEligibilityContent(),
    listPublicFundingCalls({ limit: 100 }),
    getPage("eligibility"),
  ]);
  const availableCalls = calls.items.filter(
    (call) => call.selfCheckAvailable && call.status !== "closed",
  );
  const selectedCall = requestedSlug
    ? availableCalls.find((call) => call.slug === requestedSlug)
    : availableCalls[0];
  const focus = eligibilityFocusSection(page?.blocks ?? []);
  return (
    <>
      <section className="section min-h-[720px] bg-slate-50">
        <div className="container grid gap-10 lg:grid-cols-[340px_1fr] lg:items-start">
          <aside>
            <p className="eyebrow">Before you apply</p>
            <h1 className="display mt-3 text-4xl font-semibold text-navy sm:text-5xl">
              {page?.title}
            </h1>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              {page?.summary}
            </p>
            <div className="mt-7 flex gap-3 rounded-2xl border border-orange/30 bg-orange-pale p-5">
              <ShieldCheck className="size-6 shrink-0 text-brand-orange" />
              <p className="text-xs leading-5 text-slate-600">
                <strong className="block text-navy">
                  Private and indicative
                </strong>
                No information is submitted. Final eligibility is confirmed
                during formal screening.
              </p>
            </div>
          </aside>
          <div>
            {availableCalls.length > 1 ? (
              <nav
                aria-label="Funding call eligibility checks"
                className="mb-5 flex flex-wrap gap-2"
              >
                {availableCalls.map((call) => (
                  <Link
                    className={
                      call.id === selectedCall?.id
                        ? "rounded-full bg-brand-navy px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-full border border-brand-navy/20 bg-white px-4 py-2 text-sm font-semibold text-brand-navy"
                    }
                    href={`/eligibility?fundingCall=${call.slug}`}
                    key={call.id}
                  >
                    {call.title}
                  </Link>
                ))}
              </nav>
            ) : null}
            {selectedCall ? (
              <PublicEligibilitySelfCheck fundingCallId={selectedCall.id} />
            ) : (
              <div className="card p-8">
                <h2 className="text-xl font-bold text-navy">
                  Eligibility self-check unavailable
                </h2>
                <p className="mt-3 text-sm text-slate-600">
                  No published funding call currently offers a self-check.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="bg-brand-white py-12">
        <div className="container">
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-navy">
            {focus.eyebrow}
          </p>
          <h2 className="mt-3 mb-6 text-3xl font-semibold text-brand-navy">
            {focus.heading}
          </h2>
          <FocusSectors content={focus} items={content} />
        </div>
      </section>
    </>
  );
}
