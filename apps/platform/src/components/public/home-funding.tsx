import { ArrowRight, CalendarDays, CircleDollarSign, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "./section-heading";

const opportunities = [
  { image: "/brand/pic2.png", status: "OPEN NOW", title: "Green Business Growth Fund", text: "Support for SMEs investing in green solutions, clean energy and climate-resilient businesses.", amount: "NAD 250,000 – 2,000,000", date: "Closes 30 Apr 2025", audience: "All eligible SMEs" },
  { image: "/brand/pic3.png", status: "OPEN NOW", title: "Women in Business Fund", text: "Funding and support for women-owned SMEs to scale and create jobs.", amount: "NAD 100,000 – 1,000,000", date: "Closes 15 May 2025", audience: "Women-owned SMEs" },
  { image: "/brand/pic4.png", status: "COMING SOON", title: "SME Growth & Competitiveness Fund", text: "Support for growth-stage SMEs in priority sectors.", amount: "NAD 500,000 – 5,000,000", date: "Opens June 2025", audience: "Growth-stage SMEs" },
];

export function HomeFunding() {
  return (
    <section className="container pb-12">
      <SectionHeading title="Current funding opportunities" text="Explore our latest funding opportunities designed to support Namibian SMEs across key sectors." link="View all opportunities" />
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {opportunities.map((item) => <OpportunityCard key={item.title} item={item} />)}
      </div>
    </section>
  );
}

function OpportunityCard({ item }: { item: (typeof opportunities)[number] }) {
  return (
    <article className="funding-card flex h-[440px] flex-col overflow-hidden rounded-lg border border-slate-100 bg-white">
      <div className="relative h-[250px] shrink-0 overflow-hidden">
        <Image src={item.image} alt={item.title} fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" />
        <span className={`absolute left-4 top-3 rounded px-3 py-1 text-[10px] font-bold ${item.status === "OPEN NOW" ? "bg-[#ffca45] text-navy" : "bg-white text-orange-dark"}`}>{item.status}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-navy">{item.title}</h3>
        <p className="mt-1 text-sm leading-5 text-[#486786]">{item.text}</p>
        <div className="mt-4 space-y-2 text-xs text-[#486786]">
          <Detail icon={<CircleDollarSign />} text={item.amount} />
          <Detail icon={<CalendarDays />} text={item.date} />
          <Detail icon={<Tag />} text={item.audience} />
        </div>
        <Link href="/funding" className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-orange-dark">Learn more <ArrowRight className="size-4" /></Link>
      </div>
    </article>
  );
}

function Detail({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <p className="flex gap-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-navy">{icon}{text}</p>;
}
