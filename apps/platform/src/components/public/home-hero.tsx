import { ArrowRight, BarChart3, Leaf, Users } from "lucide-react";
import Link from "next/link";

import type { HomepageContent } from "@/modules/content/content.types";
import { CmsImage } from "./cms-image";

type HomeHeroProps = {
  content: HomepageContent;
};

export function HomeHero({ content }: HomeHeroProps) {
  return (
    <section className="hero hero-animated relative overflow-hidden bg-white">
      {content.heroImage ? (
        <DesktopHeroImage content={content} />
      ) : (
        <DesktopHeroFallback content={content} />
      )}

      <div className="hero-container relative z-10 grid min-h-[520px] items-center lg:grid-cols-[1.05fr_.95fr]">
        <div className="hero-copy max-w-[650px] py-14 lg:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-brand-navy">
            {content.eyebrow}
          </p>

          <HeroTitle title={content.title} />

          <p className="mt-5 max-w-lg text-lg leading-7 text-brand-navy/80">
            {content.summary}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={content.applyHref} className="home-primary">
              {content.applyLabel}
              <ArrowRight className="size-4" />
            </Link>

            <Link href="/eligibility" className="home-secondary">
              {content.eligibilityLabel}
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-xs font-medium text-brand-navy/80">
            <HeroBenefit icon={<BarChart3 />} text="Access funding" />
            <HeroBenefit icon={<Users />} text="Build your capacity" />
            <HeroBenefit icon={<Leaf />} text="Create opportunities" />
          </div>
        </div>

        <div className="hidden lg:block" />
      </div>

      {content.heroImage ? (
        <MobileHeroImage content={content} />
      ) : null}
    </section>
  );
}

function DesktopHeroImage({ content }: HomeHeroProps) {
  return (
    <div className="hidden lg:block">
      <div className="absolute inset-0 opacity-[.045]">
        <CmsImage
          className="h-full w-full object-cover object-left grayscale"
          image={content.heroImage}
          priority
          sizes="100vw"
        />
      </div>

      <div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-white via-white/95 to-white/65" />

      <div className="absolute inset-y-0 right-0 w-[64%]">
        <CmsImage
          className="h-full w-full object-cover object-top"
          image={content.heroImage}
          priority
          sizes="64vw"
        />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff_0%,rgba(255,255,255,.9)_12%,rgba(255,255,255,.35)_25%,transparent_42%)]" />

        <CampaignMessage heading={content.heroPanelHeading} />
        <HeroQuote message={content.heroPanelSummary} />
      </div>
    </div>
  );
}

function MobileHeroImage({ content }: HomeHeroProps) {
  return (
    <div className="relative h-[360px] overflow-hidden lg:hidden">
      <CmsImage
        className="h-full w-full object-cover object-top"
        image={content.heroImage}
        priority
        sizes="100vw"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/35 via-transparent to-transparent" />
      <CampaignMessage heading={content.heroPanelHeading} mobile />
    </div>
  );
}

function DesktopHeroFallback({ content }: HomeHeroProps) {
  return (
    <div className="absolute inset-y-0 right-0 hidden w-[46%] bg-brand-orange lg:flex lg:items-center lg:justify-center">
      <div className="brand-pattern absolute inset-0 text-white/10" />
      <div className="relative max-w-sm rounded-3xl border border-brand-navy/25 bg-white/20 p-8 text-brand-navy backdrop-blur-sm">
        <p className="text-4xl font-bold leading-tight">
          {content.heroPanelHeading}
        </p>
        <div className="mt-6 h-1.5 w-28 rounded-full bg-brand-yellow" />
        <p className="mt-6 text-sm leading-6 text-brand-navy">
          {content.heroPanelSummary}
        </p>
      </div>
    </div>
  );
}

function HeroTitle({ title }: { title: string }) {
  const boundary = title.indexOf(". ");
  const lead = boundary >= 0 ? title.slice(0, boundary + 1) : title;
  const emphasis = boundary >= 0 ? title.slice(boundary + 2) : "";

  return (
    <h1 className="mt-4 text-[clamp(2.6rem,4vw,3.35rem)] font-bold leading-[1.04] tracking-[-.035em] text-brand-navy">
      {lead}
      {emphasis ? (
        <>
          {" "}
          <span className="text-brand-navy">{emphasis}</span>
        </>
      ) : null}
    </h1>
  );
}

function CampaignMessage({
  heading,
  mobile = false,
}: {
  heading: string;
  mobile?: boolean;
}) {
  return (
    <div
      className={`campaign-script absolute rotate-[-6deg] text-right leading-[.92] text-white [text-shadow:0_2px_5px_rgba(0,0,0,.55)] ${
        mobile
          ? "right-5 top-6 w-48 text-3xl"
          : "right-[4%] top-[9%] w-[220px] text-[clamp(1.8rem,2.15vw,2.45rem)]"
      }`}
    >
      {heading}
      <span className="ml-auto mt-3 block h-1.5 w-28 rotate-[-4deg] rounded-full bg-brand-yellow" />
    </div>
  );
}

function HeroQuote({ message }: { message: string }) {
  return (
    <div className="absolute bottom-[14%] right-[4%] w-[270px] rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
      <p className="text-sm font-semibold leading-5 text-brand-navy">
        “{message}”
      </p>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-brand-navy/60">
        <span className="h-1 w-7 bg-brand-gold" />
        SME Fund Namibia
      </div>
    </div>
  );
}

function HeroBenefit({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="flex items-center gap-2 [&_svg]:size-5 [&_svg]:text-brand-navy">
      {icon}
      {text}
    </span>
  );
}
