import { BarChart3, Leaf, Users } from "lucide-react";

import type { HomeBannerContent } from "@/modules/content/ContentTypes";
import { CmsImage } from "@/modules/content/ui/public/CmsImage";
import { GeneralButtonLink } from "@/components/ui/button";

type HomeHeroProps = {
  content: HomeBannerContent;
};

export function HomeHero({ content }: HomeHeroProps) {
  return (
    <section className="hero hero-animated @container/banner relative overflow-hidden bg-white font-sans">
      {content.heroImage ? (
        <DesktopHeroImage content={content} />
      ) : (
        <DesktopHeroFallback content={content} />
      )}

      <div className="hero-container relative z-10 mx-auto grid min-h-130 min-w-0 grid-cols-[minmax(0,1fr)] items-center w-[min(1720px,calc(100%-2rem))] @min-[640px]/banner:w-[min(1720px,calc(100%-5rem))] @5xl/banner:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <div className="hero-copy min-w-0 max-w-162.5 py-14 @5xl/banner:py-16">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[.2em] text-brand-navy">
            {content.eyebrow}
          </p>

          <HeroTitle title={content.title} />

          <p className="m-0 mt-5 max-w-lg text-lg leading-7 text-brand-navy/80">
            {content.summary}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <GeneralButtonLink
              variant="primary"
              href="/portal/applications/new"
              className="border-solid no-underline"
            >
              {content.applyLabel}
            </GeneralButtonLink>
            <GeneralButtonLink
              variant="outlineOrange"
              href="/funding"
              className="border-solid no-underline"
            >
              {content.fundingButtonLabel}
            </GeneralButtonLink>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-xs font-medium text-brand-navy/80">
            <HeroBenefit icon={<BarChart3 />} text={content.benefitFunding} />
            <HeroBenefit icon={<Users />} text={content.benefitCapacity} />
            <HeroBenefit icon={<Leaf />} text={content.benefitOpportunity} />
          </div>
        </div>

        <div className="hidden @5xl/banner:block" />
      </div>

      {content.heroImage ? <MobileHeroImage content={content} /> : null}
    </section>
  );
}

function DesktopHeroImage({ content }: HomeHeroProps) {
  return (
    <div className="hidden @5xl/banner:block">
      <div className="absolute inset-0 opacity-[.045]">
        <CmsImage
          className="h-full w-full object-cover object-left grayscale"
          image={content.heroImage}
          priority
          sizes="100vw"
        />
      </div>

      <div className="absolute inset-y-0 left-0 w-[58%] bg-linear-to-r from-white via-white/95 to-white/65" />

      <div className="absolute right-0 top-0 aspect-video h-full">
        <CmsImage
          className="h-full w-full object-cover object-top"
          image={content.heroImage}
          priority
          sizes="960px"
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
    <div className="relative aspect-video overflow-hidden @5xl/banner:hidden">
      <CmsImage
        className="h-full w-full object-cover object-top"
        image={content.heroImage}
        priority
        sizes="100vw"
      />

      <div className="absolute inset-0 bg-linear-to-t from-brand-navy/35 via-transparent to-transparent" />
      <CampaignMessage heading={content.heroPanelHeading} mobile />
    </div>
  );
}

function DesktopHeroFallback({ content }: HomeHeroProps) {
  return (
    <div className="absolute inset-y-0 right-0 hidden w-[46%] bg-brand-orange @5xl/banner:flex @5xl/banner:items-center @5xl/banner:justify-center">
      <div className="absolute inset-0 text-white/10 bg-[radial-gradient(circle_at_50%_50%,transparent_0_24%,currentColor_25%_39%,transparent_40%),linear-gradient(45deg,transparent_45%,currentColor_46%_54%,transparent_55%)] bg-size-[52px_52px]" />
      <div className="relative max-w-sm rounded-3xl border border-brand-navy/25 bg-white/20 p-8 text-brand-navy backdrop-blur-sm">
        <p className="m-0 text-4xl font-bold leading-tight">
          {content.heroPanelHeading}
        </p>
        <div className="mt-6 h-1.5 w-28 rounded-full bg-brand-yellow" />
        <p className="m-0 mt-6 text-sm leading-6 text-brand-navy">
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
    <h1 className="m-0 mt-4 wrap-break-word text-[clamp(2.6rem,4cqw,3.35rem)] font-bold leading-[1.04] tracking-[-.035em] text-brand-navy">
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
      className={`font-['Segoe_Print','Bradley_Hand','Comic_Sans_MS',cursive] italic font-bold absolute -rotate-6 text-right leading-[.92] text-white [text-shadow:0_2px_5px_rgba(0,0,0,.55)] ${
        mobile
          ? "right-5 top-6 w-48 text-3xl"
          : "right-[4%] top-[9%] w-55 text-[clamp(1.8rem,2.15cqw,2.45rem)]"
      }`}
    >
      {heading}
      <span className="ml-auto mt-3 block h-1.5 w-28 rotate-[-4deg] rounded-full bg-brand-yellow" />
    </div>
  );
}

function HeroQuote({ message }: { message: string }) {
  return (
    <div className="absolute bottom-[14%] right-[4%] w-67.5 rounded-xl border border-solid border-slate-200 bg-white p-5 shadow-xl">
      <p className="m-0 text-sm font-semibold leading-5 text-brand-navy">
        “{message}”
      </p>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-brand-navy/60">
        <span className="h-1 w-7 bg-brand-orange" />
        SME Fund Namibia
      </div>
    </div>
  );
}

function HeroBenefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-2 [&_svg]:size-5 [&_svg]:text-brand-orange">
      {icon}
      {text}
    </span>
  );
}
