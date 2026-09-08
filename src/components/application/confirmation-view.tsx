"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clipboard, Clock3, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApplicationStore } from "@/store/application-store";

export function ConfirmationView() {
  const { application, reference } = useApplicationStore();
  useEffect(() => { void useApplicationStore.persist.rehydrate(); }, []);
  const displayReference = reference ?? "SMEF-2026-00017";
  return <div className="card overflow-hidden text-center"><div className="bg-emerald-50 px-6 py-12"><div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-200"><CheckCircle2 className="size-10"/></div><p className="eyebrow mt-7 text-emerald-700">Application received</p><h1 className="display mt-3 text-4xl font-semibold text-navy sm:text-5xl">Thank you{application.firstName ? `, ${application.firstName}` : ""}.</h1><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">Your application has entered the completeness-check stage. Keep your reference number for future correspondence.</p></div><div className="p-7 sm:p-10"><div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Application reference</p><div className="mt-2 flex items-center justify-center gap-3"><strong className="text-2xl tracking-wide text-navy">{displayReference}</strong><button type="button" onClick={() => { navigator.clipboard?.writeText(displayReference); toast.success("Reference copied"); }} className="text-slate-400 hover:text-navy" aria-label="Copy application reference"><Clipboard className="size-5"/></button></div></div><div className="mx-auto mt-8 grid max-w-2xl gap-4 text-left sm:grid-cols-2"><div className="flex gap-3 rounded-2xl bg-sky-pale p-5"><Clock3 className="size-5 shrink-0 text-navy"/><div><strong className="text-sm text-navy">What happens next?</strong><p className="mt-1 text-xs leading-5 text-slate-600">The programme team checks whether the application and supporting documents are complete.</p></div></div><div className="flex gap-3 rounded-2xl bg-amber-50 p-5"><Mail className="size-5 shrink-0 text-amber-700"/><div><strong className="text-sm text-navy">Stay reachable</strong><p className="mt-1 text-xs leading-5 text-slate-600">Any request for additional information will appear on your dashboard.</p></div></div></div><Button asChild variant="gold" size="lg" className="mt-9"><Link href="/dashboard">View my application <ArrowRight className="size-4"/></Link></Button></div></div>;
}
