import { BarChart3, Leaf, Users, Venus } from "lucide-react";

import { SectionHeading } from "./section-heading";

const groups = [
  { icon: Users, title: "Youth-owned businesses", text: "Supporting young entrepreneurs to build a brighter future.", accent: "bg-orange" },
  { icon: Venus, title: "Women-owned businesses", text: "Backing women-led enterprises to grow and create opportunities.", accent: "bg-[#f4763a]" },
  { icon: BarChart3, title: "Growth-stage SMEs", text: "Helping established SMEs scale, innovate and create jobs.", accent: "bg-orange" },
  { icon: Leaf, title: "Businesses in priority sectors", text: "Including green economy, agro-processing, tourism, manufacturing and more.", accent: "bg-[#5e963d]" },
];

export function HomeSupport() {
  return (
    <section className="border-y border-[#eee8dd] bg-[#fffcf7] py-10">
      <div className="container">
        <SectionHeading title="Who we support" text="We invest in Namibian SMEs with high potential, inclusive impact and a commitment to growth." />
      </div>
      <div className="support-marquee mt-6 overflow-hidden py-5">
        <div className="support-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="support-group" aria-hidden={copy === 1}>
              {groups.map(({ icon: Icon, title, text, accent }) => (
                <article key={`${copy}-${title}`} className="support-card rounded-xl border border-slate-100 bg-white p-4">
                  <span className={`${accent} grid size-12 place-items-center rounded-full text-white`}><Icon className="size-6" /></span>
                  <h3 className="mt-4 min-h-12 text-xl font-bold leading-6 text-navy">{title}</h3>
                  <p className="mt-2 text-sm leading-5 text-[#486786]">{text}</p>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
