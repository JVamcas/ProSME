import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";

import { ActiveNavigationLink } from "@/components/layout/active-navigation-link";
import { primaryNavigation } from "@/components/layout/primary-navigation";
import { getHeader } from "@/modules/content/content.queries";
import type { HeaderContent } from "@/modules/content/content.types";

export async function SiteHeader() {
  const content = await getHeader();

  return (
    <header className="sticky top-0 z-50 shadow-md">
      <div className="hidden border-b border-brand-blue bg-white lg:block">
        <div className="container flex h-10 items-center overflow-hidden text-[10px] text-brand-navy">
          <p className="shrink-0 font-semibold">
            {content.announcement}
            <span className="mx-3 text-brand-blue">|</span>
            A partnership for a more competitive and inclusive Namibia
          </p>
          <div
            className="partner-marquee ml-8 h-full min-w-0 flex-1 overflow-hidden"
            aria-label="Programme partners"
          >
            <div className="partner-track h-full">
              <PartnerLogos />
              <PartnerLogos hidden />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-brand-orange text-white">
        <div className="container flex h-[76px] items-center justify-between gap-6">
          <Link href="/" aria-label="SME Fund home">
            <Image
              src="/brand/sme-fund-logo.svg"
              alt="SME Fund"
              width={220}
              height={50}
              className="h-12 w-auto brightness-0 invert"
              loading="eager"
            />
          </Link>
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center rounded-full border border-white/70 px-6 text-sm font-bold text-white hover:bg-white/10"
            >
              {content.signInLabel}
            </Link>
            <Link
              href={content.applyHref}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-navy px-6 text-sm font-bold text-white"
            >
              {content.applyLabel}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <MobileNavigation content={content} />
        </div>
      </div>

      <div className="border-b border-brand-blue bg-white">
        <nav
          className="container hidden min-h-12 items-center justify-between gap-4 overflow-x-auto lg:flex"
          aria-label="Primary navigation"
        >
          {primaryNavigation.map((link) => (
            <ActiveNavigationLink
              className="flex min-h-12 shrink-0 items-center px-1 text-[13px] font-semibold text-brand-navy hover:text-brand-orange hover:underline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-navy"
              key={link.href}
              {...link}
            />
          ))}
        </nav>
      </div>
    </header>
  );
}

function PartnerLogos({ hidden = false }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden || undefined} className="partner-group h-full">
      <Image
        src="/brand/npc-logo.png"
        alt={hidden ? "" : "Republic of Namibia"}
        width={30}
        height={30}
        className="size-7 object-contain"
      />
      <Image
        src="/brand/giz-logo.svg"
        alt={hidden ? "" : "GIZ"}
        width={92}
        height={24}
      />
      <Image
        src="/brand/nipdb-logo.png"
        alt={hidden ? "" : "NIPDB"}
        width={70}
        height={22}
        className="h-5 w-auto object-contain"
      />
      <Image
        src="/brand/ProSME-logo-with-tagline.svg"
        alt={hidden ? "" : "ProSME"}
        width={92}
        height={34}
        className="h-8 w-auto"
      />
    </div>
  );
}

function MobileNavigation({ content }: { content: HeaderContent }) {
  return (
    <details className="group relative lg:hidden">
      <summary className="grid size-11 list-none place-items-center rounded-full border border-white/70 [&::-webkit-details-marker]:hidden">
        <Menu className="size-5" />
        <span className="sr-only">Open navigation</span>
      </summary>
      <nav
        className="absolute right-0 top-14 max-h-[70vh] w-72 overflow-y-auto rounded-xl border border-brand-blue bg-white p-3 text-brand-navy shadow-xl"
        aria-label="Mobile navigation"
      >
        {primaryNavigation.map((link) => (
          <ActiveNavigationLink
            className="block rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-brand-cream"
            key={link.href}
            {...link}
          />
        ))}
        <Link href="/sign-in" className="home-secondary mt-2 w-full">
          {content.signInLabel}
        </Link>
        <Link href={content.applyHref} className="home-primary mt-2 w-full">
          {content.applyLabel}
          <ArrowRight className="size-4" />
        </Link>
      </nav>
    </details>
  );
}
