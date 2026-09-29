import Link from "next/link";

import { cn } from "@/lib/utils";

export type ApplicationGuideSection = "guide" | "funding" | "eligibility";

const sections = [
  { href: "/how-to-apply", key: "guide", label: "Application guide" },
  { href: "/how-to-apply/funding", key: "funding", label: "Funding calls" },
  {
    href: "/how-to-apply/eligibility",
    key: "eligibility",
    label: "Check eligibility",
  },
] as const;

export function HowToApplyNavigation({
  active,
}: {
  active: ApplicationGuideSection;
}) {
  return (
    <div className="border-b border-brand-blue/20 bg-white">
      <nav
        aria-label="How to Apply"
        className="container flex flex-wrap gap-x-5 sm:gap-x-8"
      >
        {sections.map((section) => (
          <Link
            aria-current={active === section.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-12 items-center border-b-2 px-1 text-sm font-semibold text-brand-navy",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy",
              active === section.key
                ? "border-brand-orange"
                : "border-transparent hover:border-brand-orange/40",
            )}
            href={section.href}
            key={section.key}
          >
            {section.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
