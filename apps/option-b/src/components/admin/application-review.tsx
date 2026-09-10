import Link from "next/link";
import { AlertCircle, ArrowLeft, Banknote, Building2, Check, FileCheck2, LockKeyhole, MapPin, UserRound, Users } from "lucide-react";
import type { AdminApplication } from "@/data/admin-applications";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";

const workflow = ["Submitted", "Completeness", "Technical assessment", "Finance review", "Decision"];
const stageIndex: Record<string, number> = { Submitted: 0, "Completeness Check": 1, "More Information": 1, "Technical Assessment": 2, "Finance Review": 3, Approved: 4, Declined: 4 };

export function ApplicationReview({ application }: { application: AdminApplication }) {
  const activeStage = stageIndex[application.status] ?? 0;
  const eligibility = [
    ["Namibian ownership", `${application.ownership}% verified`],
    ["Operating history", "More than one year"],
    ["Business bank account", "Confirmation supplied"],
    ["Statutory registration", "Documents supplied"],
    ["Growth potential", "Pending technical assessment"],
  ];
  return <div className="p-4 sm:p-7">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><Link href="/admin#applications" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-navy"><ArrowLeft className="size-4"/>Back to applications</Link><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-navy">{application.business}</h1><StatusBadge status={application.status}/></div><p className="mt-1 text-xs text-slate-400">{application.id} · Submitted {new Intl.DateTimeFormat("en-NA", {dateStyle:"medium"}).format(new Date(application.submitted))}</p></div><span className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"><LockKeyhole className="size-3"/>Read-only prototype</span></div>

    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold text-navy">Application workflow</h2><p className="mt-1 text-xs text-slate-400">Current position in the review process</p></div><AlertCircle className="size-5 text-gold"/></div><div className="mt-7 grid gap-0 md:grid-cols-5">{workflow.map((title,index) => { const done=index<activeStage; const active=index===activeStage; return <div key={title} className="relative flex gap-4 pb-6 md:block md:pb-0"><span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 ${done?"border-green bg-green text-white":active?"border-orange bg-white text-navy":"border-slate-200 bg-white text-slate-300"}`}>{done?<Check className="size-4"/>:<span className="size-2 rounded-full bg-current"/>}</span>{index<workflow.length-1&&<span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 md:left-8 md:top-[15px] md:h-0.5 md:w-[calc(100%-2rem)] ${done?"bg-green":"bg-slate-200"}`}/>}<p className={`text-xs font-bold md:mt-3 ${active?"text-navy":"text-slate-500"}`}>{title}</p></div>;})}</div></section>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="grid gap-5">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><Building2 className="size-5 text-orange"/><h2 className="font-bold text-navy">Business profile</h2></div><p className="mt-5 text-sm leading-6 text-slate-600">{application.summary}</p><dl className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2"><Detail label="Applicant" value={application.applicant} icon={UserRound}/><Detail label="Sector" value={application.sector} icon={Building2}/><Detail label="Region" value={application.region} icon={MapPin}/><Detail label="Current employees" value={String(application.employees)} icon={Users}/><Detail label="Annual turnover" value={application.turnover}/><Detail label="Namibian ownership" value={`${application.ownership}%`}/></dl></section>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><Banknote className="size-5 text-orange"/><h2 className="font-bold text-navy">Funding request</h2></div><div className="mt-5 rounded-xl bg-navy p-5 text-white"><p className="text-xs text-white/50">Amount requested</p><p className="mt-1 text-3xl font-bold text-yellow-300">N${application.requested.toLocaleString("en-NA")}</p></div><h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Proposed use</h3><p className="mt-2 text-sm leading-6 text-slate-600">{application.useOfFunds}</p><p className="mt-5 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800"><strong>{application.jobs} new jobs</strong> expected if the proposed expansion is implemented.</p></section>
      </div>
      <div className="grid content-start gap-5">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><FileCheck2 className="size-5 text-orange"/><h2 className="font-bold text-navy">Eligibility summary</h2></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Initial pass</span></div><ul className="mt-5 divide-y divide-slate-100">{eligibility.map(([label,value]) => <li key={label} className="flex gap-3 py-3"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-3"/></span><div><p className="text-xs font-bold text-slate-700">{label}</p><p className="mt-1 text-[10px] text-slate-400">{value}</p></div></li>)}</ul></section>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-navy">Supporting documents</h2><strong className="text-sm text-navy">{application.documents}/8</strong></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange" style={{width:`${(application.documents/8)*100}%`}}/></div><p className="mt-3 text-xs text-slate-500">{application.documents === 8 ? "All required document categories are represented." : `${8-application.documents} document categories require attention.`}</p><Button variant="outline" className="mt-5 w-full" disabled>Open document register</Button></section>
        <section className="rounded-xl border border-orange/20 bg-orange/5 p-5"><p className="text-xs font-bold text-orange">Prototype boundary</p><p className="mt-2 text-xs leading-5 text-slate-600">Assessment, information-request and decision actions remain disabled until roles, scoring rules and approval authority are confirmed.</p></section>
      </div>
    </div>
  </div>;
}

function Detail({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{className?:string}> }) {
  return <div className="flex gap-3">{Icon&&<Icon className="mt-0.5 size-4 shrink-0 text-slate-400"/>}<div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{value}</dd></div></div>;
}
