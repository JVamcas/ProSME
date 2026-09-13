import { Banknote, FileText, MapPinned, Users } from "lucide-react";

import { getStatistics } from "@/modules/content/content.queries";
import { CmsImage } from "./cms-image";

type Block = Record<string, unknown>;
const statisticIcons = [FileText, MapPinned, Banknote, Users];

export async function StatisticsBlock({ block }: { block: Block }) {
  const configured = records(block.items);
  const items = configured.length ? configured : await getStatistics();
  return (
    <section className="relative overflow-hidden bg-brand-white py-8 text-brand-navy">
      <CmsImage
        className="absolute inset-0 h-full w-full object-cover object-center"
        image={image(block.backgroundImage)}
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.94)_0%,rgba(255,255,255,.78)_42%,rgba(255,255,255,.12)_82%)]" />
      <div className="hero-container relative z-10">
        <h2 className="text-3xl font-bold">{impactHeading(text(block.heading))}</h2>
        <p className="mt-1 text-sm text-brand-navy/80">
          {text(block.summary) || "Together, we’re building a more competitive Namibia that supports MSME growth."}
        </p>
        <div className="mt-7 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          {items.map((item, itemIndex) => {
            const Icon = statisticIcons[itemIndex % statisticIcons.length];
            return <div className="border-r border-brand-orange/35 last:border-0" key={itemIndex}>
              <Icon aria-hidden="true" className="size-7 text-brand-navy" />
              <strong className="mt-2 block text-2xl text-brand-navy">{text(item.value)}</strong>
              <p className="text-xs text-brand-navy/80">{text(item.label)}</p>
            </div>;
          })}
        </div>
      </div>
      <div aria-hidden="true" className="campaign-script absolute right-[4%] top-1/2 hidden w-[230px] -translate-y-1/2 rotate-[-6deg] text-right text-[clamp(1.65rem,2vw,2.35rem)] leading-[.98] text-brand-white [text-shadow:0_2px_5px_rgba(0,0,0,.55)] lg:block">
        Small<br />Businesses.<br />A Brighter<br />Namibia
        <span className="ml-auto mt-2 block h-1.5 w-28 rotate-[-4deg] rounded-full bg-brand-yellow" />
      </div>
    </section>
  );
}

function impactHeading(heading: string) {
  return !heading || heading === "A nationwide commitment to MSME growth"
    ? "Real businesses, lasting impact."
    : heading;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function image(value: unknown) {
  return value && typeof value === "object" && "url" in value
    ? (value as Parameters<typeof CmsImage>[0]["image"])
    : undefined;
}
