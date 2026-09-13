import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { EligibilityChecker } from "@/components/eligibility/eligibility-checker";
import { FocusSectors } from "@/components/public/focus-sectors";
import { getEligibilityContent, getEligibilityRules, getPage } from "@/modules/content/content.queries";
import { eligibilityFocusSection } from "@/modules/content/eligibility-page-content";

export const metadata: Metadata = { title: "Eligibility checker" };
export const dynamic = "force-dynamic";

export default async function EligibilityPage() {
  const [content, rules, page] = await Promise.all([getEligibilityContent(), getEligibilityRules(), getPage("eligibility")]);
  const focus = eligibilityFocusSection(page?.blocks ?? []);
  return <><section className="section min-h-[720px] bg-slate-50"><div className="container grid gap-10 lg:grid-cols-[340px_1fr] lg:items-start"><aside><p className="eyebrow">Before you apply</p><h1 className="display mt-3 text-4xl font-semibold text-navy sm:text-5xl">{page?.title}</h1><p className="mt-5 text-sm leading-6 text-slate-600">{page?.summary}</p><div className="mt-7 flex gap-3 rounded-2xl border border-orange/30 bg-orange-pale p-5"><ShieldCheck className="size-6 shrink-0 text-brand-navy"/><p className="text-xs leading-5 text-slate-600"><strong className="block text-navy">Private and indicative</strong>No information is submitted. Final eligibility is confirmed during formal screening.</p></div></aside><EligibilityChecker rules={rules} /></div></section><section className="bg-brand-white py-12"><div className="container"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-navy">{focus.eyebrow}</p><h2 className="mt-3 mb-6 text-3xl font-semibold text-brand-navy">{focus.heading}</h2><FocusSectors content={focus} items={content} /></div></section></>;
}
