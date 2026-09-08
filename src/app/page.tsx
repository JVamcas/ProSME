import Link from "next/link";
import { ArrowRight, Banknote, BookOpen, BriefcaseBusiness, CalendarDays, CheckCircle2, FileCheck2, Globe2, GraduationCap, Network, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const quickLinks = [
  { href: "/funding", icon: Banknote, title: "Funding calls", text: "View available support" },
  { href: "/eligibility", icon: CheckCircle2, title: "Eligibility checker", text: "See if your business qualifies" },
  { href: "/apply", icon: FileCheck2, title: "Apply now", text: "Start your application" },
  { href: "/how-to-apply", icon: BookOpen, title: "Application guide", text: "Prepare before you apply" },
];

const support = [
  { icon: Banknote, title: "Grant funding", text: "N$50,000 to N$100,000 for eligible business growth activities." },
  { icon: GraduationCap, title: "Business support", text: "Capacity building, mentorship, coaching and technical guidance." },
  { icon: Globe2, title: "Market linkages", text: "Support to prepare for expansion, exports and investment opportunities." },
];

export default function Home() {
  return <>
    <section className="relative overflow-hidden bg-[linear-gradient(110deg,#071634_0%,#0a2852_58%,#15577b_100%)] text-white">
      <div className="soft-grid absolute inset-0 opacity-25" />
      <div className="absolute -right-32 -top-52 size-[650px] rounded-full bg-sky/20 blur-3xl" />
      <Network className="absolute bottom-10 right-[9%] hidden size-80 text-sky/15 lg:block" strokeWidth={0.5} />
      <div className="brand-pattern absolute -bottom-16 right-0 h-56 w-[42%] text-sky/10 opacity-70" />
      <div className="container relative flex min-h-[520px] items-center py-20">
        <div className="max-w-3xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-sky">SME Fund programme</p>
          <h1 className="display max-w-3xl text-5xl font-normal leading-[1.04] sm:text-6xl">Empowering SMEs.<br />Building Namibia&apos;s Future.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/75">Accessible grant funding and tailored business support for Namibian enterprises ready to grow, innovate and create jobs.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild variant="gold" size="lg"><Link href="/funding">Explore funding <ArrowRight className="size-4" /></Link></Button><Button asChild size="lg" className="border border-white/45 bg-transparent hover:bg-white/10"><Link href="/eligibility">Eligibility checker</Link></Button></div>
        </div>
      </div>
    </section>

    <section className="relative z-10 border-b border-slate-200 bg-white shadow-sm"><div className="container grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">{[{icon:BriefcaseBusiness,n:"7",l:"Funding calls"},{icon:Users,n:"MSMEs",l:"Growth focused"},{icon:Banknote,n:"N$430k",l:"Initial fund allocation"},{icon:Globe2,n:"14",l:"Regions reached"}].map(({icon:Icon,n,l})=><div key={l} className="flex items-center gap-4 px-5 py-6"><Icon className="size-7 text-green"/><div><strong className="block text-xl text-navy">{n}</strong><span className="text-xs text-slate-500">{l}</span></div></div>)}</div></section>

    <section className="bg-cream py-12"><div className="container"><p className="text-xs font-bold uppercase tracking-[.16em] text-orange">Quick access</p><h2 className="mt-2 text-2xl font-bold text-navy">What would you like to do?</h2><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{quickLinks.map(({href,icon:Icon,title,text})=><Link href={href} key={title} className="group rounded-xl border border-navy/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky hover:shadow-md"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-lg bg-sky-pale text-navy"><Icon className="size-5"/></span><ArrowRight className="size-4 text-slate-300 transition group-hover:text-orange"/></div><h3 className="mt-5 text-sm font-bold text-navy">{title}</h3><p className="mt-1 text-xs text-slate-500">{text}</p></Link>)}</div></div></section>

    <section className="section bg-white"><div className="container"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-orange">Featured opportunity</p><h2 className="display mt-3 text-4xl font-normal text-navy">SME Growth Grant</h2><p className="mt-4 leading-7 text-slate-600">A competitive, merit-based funding opportunity for established Namibian MSMEs with a feasible business model and clear growth potential.</p></div><Button asChild variant="outline"><Link href="/funding">View details <ArrowRight className="size-4"/></Link></Button></div><div className="mt-9 grid gap-5 md:grid-cols-[1.3fr_.7fr]"><div className="overflow-hidden rounded-xl border border-slate-200"><div className="grid gap-6 bg-navy p-7 text-white sm:grid-cols-3"><div><p className="text-xs text-white/55">Grant amount</p><p className="mt-2 text-2xl font-bold text-yellow-300">N$50k–100k</p></div><div><p className="text-xs text-white/55">Business history</p><p className="mt-2 text-2xl font-bold">1+ year</p></div><div><p className="text-xs text-white/55">Ownership</p><p className="mt-2 text-2xl font-bold">51% Namibian</p></div></div><div className="grid gap-4 p-7 sm:grid-cols-2">{["Youth and women-owned enterprises", "Existing SMEs ready to expand", "Enterprises in priority sectors", "Businesses with job-creation potential"].map(x=><p key={x} className="flex gap-3 text-sm text-slate-700"><CheckCircle2 className="size-5 shrink-0 text-green"/>{x}</p>)}</div></div><div className="rounded-xl border border-sky/40 bg-sky-pale p-7"><CalendarDays className="size-7 text-navy"/><h3 className="mt-5 font-bold text-navy">Applications opening soon</h3><p className="mt-3 text-sm leading-6 text-slate-600">Check your eligibility and prepare the required documents before the first call opens.</p><Button asChild variant="gold" className="mt-6 w-full"><Link href="/eligibility">Check eligibility</Link></Button></div></div></div></section>

    <section className="section border-y border-slate-200 bg-cream"><div className="container"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.16em] text-orange">Enterprise development</p><h2 className="display mt-3 text-4xl font-normal text-navy">Financial and non-financial support</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{support.map(({icon:Icon,title,text})=><article key={title} className="rounded-xl border border-navy/10 bg-white p-7 shadow-sm"><Icon className="size-7 text-sky"/><h3 className="mt-5 font-bold text-navy">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></div></section>

    <section className="bg-navy py-14 text-white"><div className="container flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-center"><div className="flex gap-4"><ShieldCheck className="mt-1 size-8 shrink-0 text-sky"/><div><h2 className="text-2xl font-bold">Ready to find out if you qualify?</h2><p className="mt-2 text-sm text-white/60">Complete the initial check before starting an application.</p></div></div><Button asChild variant="gold" size="lg"><Link href="/eligibility">Check eligibility <ArrowRight className="size-4"/></Link></Button></div></section>
  </>;
}
