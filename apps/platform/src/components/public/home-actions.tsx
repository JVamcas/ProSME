import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  FileText,
} from "lucide-react";
import Link from "next/link";
import type { HomepageContent } from "@/modules/content/ContentTypes";

export function HomeActions({ content }: { content: HomepageContent }) {
  const actions = [
    {
      href: "/funding",
      icon: CircleDollarSign,
      title: content.actionCards.fundingTitle,
      text: content.actionCards.fundingDescription,
      background: "bg-brand-orange/10",
    },
    {
      href: "/eligibility",
      icon: FileText,
      title: content.actionCards.eligibilityTitle,
      text: content.actionCards.eligibilityDescription,
      background: "bg-brand-cream",
    },
    {
      href: "/portal",
      icon: CalendarDays,
      title: content.actionCards.trackingTitle,
      text: content.actionCards.trackingDescription,
      background: "bg-brand-blue/10",
    },
  ];
  return (
    <section className="container relative z-20 grid gap-3 py-5 md:grid-cols-3">
      {actions.map(({ href, icon: Icon, title, text, background }) => (
        <Link
          href={href}
          key={title}
          className={`${background} group flex min-h-40 items-center gap-5 rounded-xl border border-white p-5 transition duration-500 hover:-translate-y-1 hover:shadow-lg`}
        >
          <div className="flex-1">
            <span className="grid size-12 place-items-center rounded-full bg-brand-white text-brand-orange shadow-sm">
              <Icon className="size-6" />
            </span>
            <h2 className="mt-4 text-2xl font-bold text-navy">{title}</h2>
            <p className="mt-2 max-w-[270px] text-sm leading-5 text-brand-navy/70">
              {text}
            </p>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-white text-brand-orange">
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </section>
  );
}
