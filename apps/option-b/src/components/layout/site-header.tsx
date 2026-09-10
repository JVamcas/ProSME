import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, Search } from "lucide-react";

const links = [
  { href: "/", label: "Home" }, { href: "/funding", label: "Funding" },
  { href: "/eligibility", label: "Eligibility" }, { href: "/how-to-apply", label: "How to Apply" },
  { href: "/funding", label: "Resources" }, { href: "/how-to-apply", label: "About" },
];

export function SiteHeader() {
  return <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md">
    <div className="hidden border-b border-[#eee8dd] bg-[#fbfaf7] lg:block">
      <div className="container flex h-10 items-center justify-between text-[10px] text-[#365b82]">
        <p><strong className="text-navy">An initiative under the ProSME Project</strong><span className="mx-3 text-slate-300">|</span>A partnership for a more competitive and inclusive Namibia</p>
        <div className="partner-marquee h-full w-[470px] overflow-hidden" aria-label="Programme partners">
          <div className="partner-track h-full">
            <PartnerLogos />
            <div aria-hidden="true"><PartnerLogos /></div>
          </div>
        </div>
      </div>
    </div>
    <div className="border-b border-slate-200 shadow-sm">
      <div className="container flex h-[86px] items-center justify-between gap-7">
        <Link href="/" aria-label="SME Fund home"><Image src="/brand/sme-fund-logo.svg" alt="SME Fund" width={220} height={50} className="h-12 w-auto" priority /></Link>
        <nav className="hidden h-full items-center gap-7 lg:flex" aria-label="Primary navigation">{links.map((link, i) => <Link key={`${link.label}-${i}`} href={link.href} className={`flex h-full items-center border-b-2 px-1 text-sm font-semibold transition ${i === 0 ? "border-orange text-orange-dark" : "border-transparent text-[#294768] hover:border-orange hover:text-orange-dark"}`}>{link.label}</Link>)}</nav>
        <div className="hidden items-center gap-3 lg:flex"><button aria-label="Search" className="grid size-10 place-items-center text-navy"><Search className="size-5" /></button><Link href="/dashboard" className="home-secondary h-11 px-6">Sign In</Link><Link href="/apply" className="home-primary h-11 px-6">Apply Now <ArrowRight className="size-4" /></Link></div>
        <details className="group relative lg:hidden"><summary className="grid size-11 list-none place-items-center rounded-full border border-slate-200 [&::-webkit-details-marker]:hidden"><Menu className="size-5" /><span className="sr-only">Open navigation</span></summary><div className="absolute right-0 top-14 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">{links.map((link, i) => <Link key={`${link.label}-${i}`} href={link.href} className="block rounded-lg px-4 py-3 text-sm font-semibold text-navy hover:bg-slate-50">{link.label}</Link>)}<Link href="/apply" className="home-primary mt-2 w-full">Apply Now <ArrowRight className="size-4" /></Link></div></details>
      </div>
    </div>
  </header>;
}

function PartnerLogos() {
  return <div className="partner-group h-full">
    <Image src="/brand/npc-logo.png" alt="Republic of Namibia" width={30} height={30} className="size-7 object-contain" />
    <Image src="/brand/giz-logo.svg" alt="GIZ" width={92} height={24} />
    <Image src="/brand/nipdb-logo.png" alt="NIPDB" width={70} height={22} className="h-5 w-auto object-contain" />
    <span className="h-6 border-l border-slate-300" />
    <Image src="/brand/ProSME-logo-with-tagline.svg" alt="ProSME" width={92} height={34} className="h-8 w-auto" />
  </div>;
}
