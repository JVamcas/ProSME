import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Banknote,
  Check,
  Globe2,
  HeartHandshake,
  Lightbulb,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";

import type {
  FundingIconKey,
  FundingPrioritiesContent,
  FundingSupportContent,
} from "@/modules/content/FundingPageContent";

const icons: Record<FundingIconKey, LucideIcon> = {
  grant: Banknote,
  growth: Target,
  impact: Lightbulb,
  inclusive: Users,
  innovation: Lightbulb,
  market: Globe2,
  mentorship: HeartHandshake,
};

export function FundingSupport({
  content,
}: {
  content: FundingSupportContent;
}) {
  return (
    <section className="section bg-brand-white">
      <div className="container grid gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-navy">
            {content.eyebrow}
          </p>
          <h2 className="display mt-3 text-4xl font-semibold text-brand-navy">
            {content.heading}
          </h2>
          <p className="mt-5 leading-7 text-brand-navy/75">
            {content.description}
          </p>
          <ul className="mt-7 grid gap-3">
            {content.uses.map((item) => (
              <li
                className="flex gap-3 text-base text-brand-navy/85"
                key={item}
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-orange/10">
                  <Check className="size-3 text-brand-orange" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <FundingCards cards={content.cards} />
      </div>
    </section>
  );
}

function FundingCards({ cards }: { cards: FundingSupportContent["cards"] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {cards.map(({ description, icon, title }) => {
        const Icon = icons[icon];
        return (
          <article
            className="rounded-2xl border border-brand-blue/25 bg-brand-white p-6 shadow-[0_12px_35px_rgba(10,24,59,0.08)]"
            key={title}
          >
            <Icon className="size-6 text-brand-orange" />
            <h3 className="mt-4 font-bold text-brand-navy">{title}</h3>
            <p className="mt-2 text-sm leading-5 text-brand-navy/75">
              {description}
            </p>
          </article>
        );
      })}
    </div>
  );
}

export function FundingPriorities({
  content,
}: {
  content: FundingPrioritiesContent;
}) {
  return (
    <section className="section bg-brand-cream/30">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-navy">
            {content.eyebrow}
          </p>
          <h2 className="display mt-3 text-4xl font-semibold text-brand-navy">
            {content.heading}
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {content.items.map(({ description, icon, title }) => {
            const Icon = icons[icon];
            return (
              <article
                className="rounded-2xl border border-brand-blue/25 bg-brand-white p-7 shadow-[0_12px_35px_rgba(10,24,59,0.08)]"
                key={title}
              >
                <Icon className="size-7 text-brand-orange" />
                <h3 className="mt-5 text-lg font-bold text-brand-navy">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-brand-navy/75">
                  {description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FundingCallToAction() {
  return (
    <section className="bg-brand-cream py-14">
      <div className="container flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="display text-3xl font-semibold text-brand-navy">
            Could this be your next step?
          </h2>
          <p className="mt-2 text-sm text-brand-navy/75">
            Check all mandatory requirements before applying.
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-orange px-7 text-base font-bold text-brand-navy shadow-[0_8px_20px_rgba(10,24,59,0.18)] transition-colors hover:bg-brand-yellow"
          href="/eligibility"
        >
          Check eligibility <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
