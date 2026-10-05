import { BarChart3, Leaf, Users, Venus } from "lucide-react";

import { ArrowLink } from "@/components/ui/links";
import type { HomepageContent } from "@/modules/content/ContentTypes";

const icons = [Users, Venus, BarChart3, Leaf];

export function HomeSupport({
  content,
  presentation = "marquee",
}: {
  content: Pick<
    HomepageContent,
    "supportHeading" | "supportIntroduction" | "supportCards"
  >;
  presentation?: "marquee" | "grid";
}) {
  const groups = content.supportCards;
  return (
    <section className="bg-brand-cream/30 py-12">
      <div className="container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-brand-navy">
              {content.supportHeading}
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-brand-navy">
              {content.supportIntroduction}
            </p>
          </div>
          <ArrowLink href="/eligibility">See eligibility details</ArrowLink>
        </div>
      </div>
      {presentation === "grid" ? (
        <div className="container mt-6">
          <SupportGroup groups={groups} presentation="grid" />
        </div>
      ) : (
        <div className="support-marquee mt-6 overflow-hidden py-3">
          <div className="support-track">
            <SupportGroup groups={groups} />
            <SupportGroup groups={groups} hidden />
          </div>
        </div>
      )}
    </section>
  );
}

function SupportGroup({
  groups,
  hidden = false,
  presentation = "marquee",
}: {
  groups: { label: string; description: string }[];
  hidden?: boolean;
  presentation?: "marquee" | "grid";
}) {
  return (
    <div
      aria-hidden={hidden || undefined}
      className={
        presentation === "grid"
          ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          : "support-group"
      }
    >
      {groups.map((group, index) => {
        const Icon = icons[index % icons.length];
        return (
          <article
            className={`${presentation === "grid" ? "min-w-0" : "support-card"} rounded-xl border border-brand-blue/20 bg-white p-5`}
            key={`${hidden ? "copy" : "main"}-${index}`}
          >
            <span className="grid size-12 place-items-center rounded-full bg-brand-orange/10 text-brand-orange">
              <Icon className="size-6" />
            </span>
            <h3 className="mt-4 min-h-12 text-xl font-bold leading-6 text-brand-navy">
              {group.label}
            </h3>
            <p className="mt-2 text-sm leading-6 text-brand-navy">
              {group.description}
            </p>
          </article>
        );
      })}
    </div>
  );
}
