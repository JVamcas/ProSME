import { ArrowRight, BarChart3, Leaf, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function HomeHero() {
  return (
    <section className="hero hero-animated relative overflow-hidden bg-white">
      <HeroImage />
      <div className="absolute inset-y-0 left-0 hidden w-[55%] bg-gradient-to-r from-white via-white/95 to-white/65 lg:block" />
      <div className="hero-container relative z-10 grid min-h-[520px] items-center lg:grid-cols-[1.05fr_.95fr]">
        <div className="hero-copy max-w-[650px] py-14 lg:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-orange-dark">Funding today. A stronger tomorrow.</p>
          <h1 className="mt-4 text-[clamp(2.6rem,4vw,3.35rem)] font-bold leading-[1.04] tracking-[-.035em] text-navy">
            <span className="block">Your business has</span>
            <span className="block">potential. <span className="text-orange">We help you</span></span>
            <span className="block text-orange">take the next step.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-7 text-[#294768]">Funding and business development support for Namibian SMEs ready to grow.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/funding" className="home-primary">Find Funding <ArrowRight className="size-4" /></Link>
            <Link href="/eligibility" className="home-secondary">Check My Eligibility</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-xs font-medium text-[#365b82]">
            <HeroBenefit icon={<BarChart3 />} text="Access funding" />
            <HeroBenefit icon={<Users />} text="Build your capacity" />
            <HeroBenefit icon={<Leaf />} text="Create opportunities" />
          </div>
        </div>
        <div className="hidden lg:block" />
      </div>
    </section>
  );
}

function HeroBenefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span className="flex items-center gap-2 [&_svg]:size-5 [&_svg]:text-orange">{icon}{text}</span>;
}

function HeroImage() {
  return (
    <div className="absolute inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[64%]">
      <Image src="/brand/pic1.png" alt="Namibian entrepreneur in her shop" fill priority className="hero-main-photo object-cover object-[58%_top] lg:object-top" sizes="(max-width: 1023px) 100vw, 64vw" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.92)_0%,rgba(255,255,255,.78)_52%,rgba(255,255,255,.48)_100%),linear-gradient(to_bottom,rgba(255,255,255,.08)_0%,transparent_62%,rgba(255,255,255,.32)_100%)] lg:hidden" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(to_right,#fff_0%,rgba(255,255,255,.9)_12%,rgba(255,255,255,.35)_25%,transparent_42%)] lg:block" />
      <div className="campaign-script hero-campaign absolute right-[4%] top-[9%] hidden w-[220px] rotate-[-6deg] text-right text-[clamp(1.8rem,2.15vw,2.45rem)] leading-[.88] text-white [text-shadow:0_2px_5px_rgba(0,0,0,.55)] lg:block">
        Bigger<br />Businesses<br /><span className="text-[#fff8e8]">Brighter<br />Namibia</span>
        <span className="ml-auto mt-2 block h-1.5 w-28 rotate-[-4deg] rounded-full bg-[#f2a900]" />
      </div>
      <div className="hero-quote absolute bottom-[14%] right-[4%] hidden w-[250px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl lg:block">
        <p className="text-sm font-semibold leading-5 text-navy">“With the right support, small businesses do extraordinary things.”</p>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500"><span className="h-1 w-7 bg-gold" />Namibian Entrepreneur</div>
      </div>
    </div>
  );
}
