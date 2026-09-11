import { BriefcaseBusiness, FileText, Leaf, Users } from "lucide-react";
import Image from "next/image";

const statistics = [
  { icon: Users, value: "300+", label: "Enterprises supported" },
  { icon: FileText, value: "7", label: "Funding calls" },
  { icon: BriefcaseBusiness, value: "1,200+", label: "Jobs enabled" },
  { icon: Leaf, value: "Stronger SMEs", label: "More inclusive growth" },
];

export function HomeImpact() {
  return (
    <section className="relative overflow-hidden py-8">
      <Image src="/brand/pic5.png" alt="Namibian landscape" fill className="object-cover object-center" sizes="100vw" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.94)_0%,rgba(255,255,255,.78)_42%,rgba(255,255,255,.12)_82%)]" />
      <div className="hero-container relative z-10">
        <h2 className="text-3xl font-bold text-navy">Real businesses. Lasting impact.</h2>
        <p className="mt-1 text-sm text-[#365b82]">Together, we’re building a more inclusive and competitive Namibia.</p>
        <div className="mt-7 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          {statistics.map(({ icon: Icon, value, label }) => (
            <div key={label} className="border-r border-[#ffc08f] last:border-0">
              <Icon className="size-7 text-orange" />
              <strong className="mt-2 block text-2xl text-navy">{value}</strong>
              <span className="text-xs text-[#365b82]">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="campaign-script absolute right-[4%] top-1/2 hidden w-[230px] -translate-y-1/2 rotate-[-6deg] text-right text-[clamp(1.65rem,2vw,2.35rem)] leading-[.98] text-white [text-shadow:0_2px_5px_rgba(0,0,0,.55)] lg:block">
        Small<br />Businesses.<br />A Brighter<br />Namibia
        <span className="ml-auto mt-2 block h-1.5 w-28 rotate-[-4deg] rounded-full bg-[#f2a900]" />
      </div>
    </section>
  );
}
