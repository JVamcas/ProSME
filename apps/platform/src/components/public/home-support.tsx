import { BarChart3, Leaf, Users, Venus } from "lucide-react";

import { ArrowLink } from "@/components/ui/links";
import { defaultSupportGroups } from "@/modules/content/ContentDefaults";
import type { EligibilityItem } from "@/modules/content/ContentTypes";

const icons = [Users, Venus, BarChart3, Leaf];

export function HomeSupport({ items }: { items: EligibilityItem[] }) {
  const published = items.filter((item) => item.kind === "criterion");
  const groups = published.length ? published : defaultSupportGroups;
  return (
    <section className="bg-brand-cream/30 py-12">
      <div className="container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-brand-navy">
              Who we support
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-brand-navy">
              The SME Fund is open to any Namibian MSME with high potential,
              inclusive impact and a commitment to growth. Our priority areas
              include:
            </p>
          </div>
          <ArrowLink href="/eligibility">See eligibility details</ArrowLink>
        </div>
      </div>
      <div className="support-marquee mt-6 overflow-hidden py-3">
        <div className="support-track">
          <SupportGroup groups={groups} />
          <SupportGroup groups={groups} hidden />
        </div>
      </div>
    </section>
  );
}

function SupportGroup({
  groups,
  hidden = false,
}: {
  groups: { label: string; description: string }[];
  hidden?: boolean;
}) {
  return (
    <div aria-hidden={hidden || undefined} className="support-group">
      {groups.map((group, index) => {
        const Icon = icons[index % icons.length];
        return (
          <article
            className="support-card rounded-xl border border-brand-blue/20 bg-white p-5"
            key={`${hidden ? "copy" : "main"}-${group.label}`}
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
