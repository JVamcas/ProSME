import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { EligibilityChecker } from "@/components/eligibility/eligibility-checker";

export const metadata: Metadata = { title: "Eligibility checker" };

export default function EligibilityPage() {
  return <section className="section min-h-[720px] bg-slate-50"><div className="container grid gap-10 lg:grid-cols-[340px_1fr] lg:items-start"><aside><p className="eyebrow">Before you apply</p><h1 className="display mt-3 text-4xl font-semibold text-navy sm:text-5xl">Check your eligibility</h1><p className="mt-5 text-sm leading-6 text-slate-600">Answer eleven straightforward questions. Your result helps you decide whether to apply now or prepare a few outstanding items first.</p><div className="mt-7 flex gap-3 rounded-2xl border border-orange/30 bg-orange-pale p-5"><ShieldCheck className="size-6 shrink-0 text-navy"/><p className="text-xs leading-5 text-slate-600"><strong className="block text-navy">Private and indicative</strong>No information is submitted. Final eligibility is confirmed during formal screening.</p></div><p className="mt-5 text-xs leading-5 text-slate-400">Participation in a pre-incubation or acceleration programme is optional at this stage.</p></aside><EligibilityChecker /></div></section>;
}
