import { Banknote, FileText, MapPinned, Users } from "lucide-react";

import type { HomeImpactContent } from "../../HomeImpactContent";
import { CmsImage } from "./CmsImage";

const statisticIcons = [FileText, MapPinned, Banknote, Users];

export function HomeImpact({ content }: { content: HomeImpactContent }) {
  return (
    <section className="relative overflow-hidden bg-brand-white py-8 text-brand-navy">
      <CmsImage
        className="absolute inset-0 h-full w-full object-cover object-center"
        image={content.backgroundImage}
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.94)_0%,rgba(255,255,255,.78)_42%,rgba(255,255,255,.12)_82%)]" />
      <div className="hero-container relative z-10">
        <h2 className="text-3xl font-bold">{content.heading}</h2>
        <p className="mt-1 text-sm text-brand-navy/80">{content.summary}</p>
        <div className="mt-7 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          {content.items.map((item, index) => {
            const Icon = statisticIcons[index % statisticIcons.length];
            return (
              <div
                className="border-r border-brand-orange/35 last:border-0"
                key={index}
              >
                <Icon aria-hidden="true" className="size-7 text-brand-orange" />
                <strong className="mt-2 block text-2xl text-brand-navy">
                  {item.value}
                </strong>
                <p className="text-xs text-brand-navy/80">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="campaign-script absolute right-[4%] top-1/2 hidden w-[230px] -translate-y-1/2 rotate-[-6deg] text-right text-[clamp(1.65rem,2vw,2.35rem)] leading-[.98] text-brand-white [text-shadow:0_2px_5px_rgba(0,0,0,.55)] lg:block"
      >
        {content.campaignMessage}
        <span className="ml-auto mt-2 block h-1.5 w-28 rotate-[-4deg] rounded-full bg-brand-yellow" />
      </div>
    </section>
  );
}
