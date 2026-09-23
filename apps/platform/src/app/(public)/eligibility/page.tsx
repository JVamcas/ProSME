import type { Metadata } from "next";
import Link from "next/link";
import { FocusSectors } from "@/components/public/focus-sectors";
import {
  getEligibilityContent,
  getPage,
} from "@/modules/content/ServerContentQueries";
import { eligibilityFocusSection } from "@/modules/content/EligibilityPageContent";
import { EligibilitySelfCheckSidebar } from "@/modules/eligibility/ui/self-check/EligibilitySelfCheckSidebar";
import { PublicEligibilitySelfCheck } from "@/modules/eligibility/ui/self-check/PublicEligibilitySelfCheck";
import { listPublicFundingCalls } from "@/modules/funding-calls/application/ServerPublicFundingCallService";
import { PageShell } from "@/shared/ui/PageShell";

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
    <PageShell
      className="container section min-h-[720px]"
      description="Review the current requirements before starting an application."
      eyebrow="Funding"
      title="Eligibility checker"
    >
      <div className="grid gap-10 lg:grid-cols-[27rem_minmax(0,1fr)] lg:items-start xl:gap-12">
        <EligibilitySelfCheckSidebar
          description={<p>{page?.summary}</p>}
          note={(
            <p>
              Participation in a pre-incubation or acceleration programme is
              optional at this stage.
            </p>
          )}
        />
        <div className="min-w-0">
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
      <section className="rounded-3xl bg-brand-white p-6 lg:p-10">
        <p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-navy">
          {focus.eyebrow}
        </p>
        <h2 className="mt-3 mb-6 text-3xl font-semibold text-brand-navy">
          {focus.heading}
        </h2>
        <FocusSectors content={focus} items={content} />
      </section>
    </PageShell>
  );
}
