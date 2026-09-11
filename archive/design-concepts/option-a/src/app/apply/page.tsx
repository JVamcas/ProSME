import type { Metadata } from "next";
import { Clock3, LockKeyhole } from "lucide-react";
import { ApplicationWizard } from "@/components/application/application-wizard";

export const metadata: Metadata = { title: "Apply" };

export default function ApplyPage() {
  return <section className="section bg-slate-50"><div className="container"><div className="mb-9 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="eyebrow">SME Growth Grant</p><h1 className="display mt-3 text-4xl font-semibold text-navy sm:text-5xl">Funding application</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">Complete each section and review your information before submitting. For this prototype, your progress remains in this browser.</p></div><div className="flex gap-5 text-xs text-slate-500"><span className="flex items-center gap-2"><Clock3 className="size-4 text-sky"/>About 15 minutes</span><span className="flex items-center gap-2"><LockKeyhole className="size-4 text-sky"/>Demo mode</span></div></div><ApplicationWizard /></div></section>;
}
