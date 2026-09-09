import Link from "next/link";
import { ChevronDown, Menu, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About", menu: true },
  { href: "/funding", label: "Funding Opportunities" },
  { href: "/eligibility", label: "Eligibility" },
  { href: "/how-to-apply", label: "How to Apply" },
  { href: "/#resources", label: "Resources" },
  { href: "/#news", label: "News" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_2px_14px_rgba(8,42,74,.08)]">
      <div className="bg-[#073a6b] text-white">
        <div className="container flex h-6 items-center justify-between text-[10px]">
          <span>An initiative under the ProSME Project</span>
          <nav className="hidden items-center gap-6 sm:flex" aria-label="Institutional links">
            <Link href="/#partners" className="hover:text-[#ffca45]">About NIPDB</Link>
            <Link href="/#partners" className="hover:text-[#ffca45]">About GIZ</Link>
            <Link href="/#partners" className="hover:text-[#ffca45]">About NPC</Link>
            <span className="h-4 w-px bg-white/35" />
            <button type="button" className="inline-flex items-center gap-1">EN <ChevronDown className="size-3" /></button>
          </nav>
        </div>
      </div>

      <div className="container flex h-[78px] items-center justify-between gap-5">
        <Logo />
        <nav className="hidden h-full items-center gap-6 xl:flex" aria-label="Primary navigation">
          {links.map((link) => (
            <Link key={link.label} href={link.href} className={`inline-flex h-full items-center gap-1 border-b-2 px-0.5 text-[13px] font-semibold transition ${link.href === "/" ? "border-[#efb538] text-navy" : "border-transparent text-[#263c5a] hover:border-[#efb538] hover:text-navy"}`}>
              {link.label}{link.menu && <ChevronDown className="size-3" />}
            </Link>
          ))}
        </nav>
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Link href="#news" aria-label="Search" className="grid size-10 place-items-center text-navy"><Search className="size-5" /></Link>
          <Link href="/dashboard" className="inline-flex h-11 items-center rounded-lg border border-navy px-6 text-sm font-bold text-navy transition hover:bg-slate-50">Sign In</Link>
          <Link href="/apply" className="inline-flex h-11 items-center rounded-lg bg-[#efb538] px-6 text-sm font-bold text-navy transition hover:bg-[#e4a91f]">Apply Now</Link>
        </div>
        <details className="group relative xl:hidden">
          <summary className="grid size-11 list-none place-items-center rounded-lg border border-slate-200 text-navy [&::-webkit-details-marker]:hidden"><Menu className="size-5" /><span className="sr-only">Open navigation</span></summary>
          <div className="absolute right-0 top-14 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            {links.map((link) => <Link key={link.label} href={link.href} className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{link.label}</Link>)}
            <div className="mt-2 grid grid-cols-2 gap-2"><Link href="/dashboard" className="rounded-lg border border-navy px-4 py-3 text-center text-sm font-bold text-navy">Sign In</Link><Link href="/apply" className="rounded-lg bg-[#efb538] px-4 py-3 text-center text-sm font-bold text-navy">Apply Now</Link></div>
          </div>
        </details>
      </div>
    </header>
  );
}
