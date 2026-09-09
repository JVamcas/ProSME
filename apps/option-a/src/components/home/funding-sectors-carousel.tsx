"use client";

import {
  Factory,
  Feather,
  Grid2X2,
  Laptop,
  Leaf,
  Palette,
  SunMedium,
} from "lucide-react";

const sectors = [
  { icon: Feather, title: "Agriculture & Agro-processing", color: "text-[#1075b6]" },
  { icon: Leaf, title: "Renewable Energy & Green Economy", color: "text-[#168b49]" },
  { icon: SunMedium, title: "Tourism & Hospitality", color: "text-[#eda910]" },
  { icon: Palette, title: "Creative Industries", color: "text-[#f0a30e]" },
  { icon: Factory, title: "Manufacturing & Value Addition", color: "text-[#526274]" },
  { icon: Laptop, title: "Digital & ICT", color: "text-[#1176b8]" },
  { icon: Grid2X2, title: "Other Priority Sectors", color: "text-[#168b49]" },
];

function SectorGroup({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="sector-carousel-group" aria-hidden={duplicate || undefined}>
      {sectors.map(({ icon: Icon, title, color }) => (
        <article key={title} className="flex h-[200px] w-48 shrink-0 flex-col items-center justify-center rounded-lg border border-[#dbe3ea] bg-white px-4 text-center">
          <Icon className={`size-10 ${color}`} strokeWidth={1.8} />
          <h3 className="mt-6 text-sm font-bold leading-5 text-navy">{title}</h3>
        </article>
      ))}
    </div>
  );
}

export function FundingSectorsCarousel() {
  return (
    <div className="sector-carousel" role="region" aria-label="Funding sectors">
      <div className="sector-carousel-track">
        <SectorGroup />
        <SectorGroup duplicate />
      </div>
    </div>
  );
}
