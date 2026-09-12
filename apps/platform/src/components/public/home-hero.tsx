import { ArrowRight, BarChart3, Leaf, Users } from "lucide-react";
import Link from "next/link";

import type { HomepageContent } from "@/modules/content/content.types";
import { CmsImage } from "./cms-image";

export function HomeHero({ content }: { content: HomepageContent }) {
  return (
    <section className="hero hero-animated relative overflow-hidden bg-white">
      <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-brand-orange lg:block"><div className="brand-pattern absolute inset-0 text-white/10" /></div>
      <div className="hero-container relative z-10 grid min-h-[520px] items-center lg:grid-cols-[1.05fr_.95fr]">
        <div className="hero-copy max-w-[650px] py-14 lg:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-brand-orange">{content.eyebrow}</p>
          <h1 className="mt-4 text-[clamp(2.6rem,4vw,3.35rem)] font-bold leading-[1.04] tracking-[-.035em] text-brand-navy">
            {content.title}
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-7 text-brand-navy">{content.summary}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={content.applyHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-orange px-7 text-sm font-bold text-white shadow-lg">{content.applyLabel} <ArrowRight className="size-4" /></Link>
            <Link href="/eligibility" className="inline-flex min-h-12 items-center justify-center rounded-full border border-brand-orange bg-white px-7 text-sm font-bold text-brand-navy hover:bg-brand-cream">{content.eligibilityLabel}</Link>
            <Link href="/portal" className="inline-flex min-h-12 items-center justify-center rounded-full border border-brand-orange bg-white px-7 text-sm font-bold text-brand-navy hover:bg-brand-cream">{content.trackingLabel}</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-xs font-medium text-brand-navy">
            <HeroBenefit icon={<BarChart3 />} text="Access funding" />
            <HeroBenefit icon={<Users />} text="Build your capacity" />
            <HeroBenefit icon={<Leaf />} text="Create opportunities" />
          </div>
        </div>
        <div className="relative flex min-h-72 items-center justify-center bg-brand-orange px-4 py-8 lg:h-full lg:bg-transparent lg:p-0">{content.heroImage ? <CmsImage className="h-72 w-full rounded-3xl object-cover shadow-2xl lg:h-[420px] lg:w-[86%]" image={content.heroImage} priority sizes="(max-width: 1023px) 100vw, 42vw" /> : <div className="max-w-sm rounded-3xl border border-white/25 bg-white/10 p-8 text-white backdrop-blur-sm"><p className="text-4xl font-bold leading-tight">{content.heroPanelHeading}</p><div className="mt-6 h-1.5 w-28 rounded-full bg-brand-yellow" /><p className="mt-6 text-sm leading-6 text-white/85">{content.heroPanelSummary}</p></div>}</div>
      </div>
    </section>
  );
}

function HeroBenefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span className="flex items-center gap-2 [&_svg]:size-5 [&_svg]:text-brand-orange">{icon}{text}</span>;
}
