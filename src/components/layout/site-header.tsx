import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/funding", label: "Funding" },
  { href: "/eligibility", label: "Eligibility" },
  { href: "/how-to-apply", label: "How to apply" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="container flex h-20 items-center justify-between gap-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-semibold text-slate-600 transition hover:text-navy">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost"><Link href="/dashboard">Applicant portal</Link></Button>
          <Button asChild variant="gold"><Link href="/apply">Apply now</Link></Button>
        </div>
        <details className="group relative md:hidden">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-slate-200 text-navy [&::-webkit-details-marker]:hidden">
            <Menu className="size-5" aria-hidden="true" />
            <span className="sr-only">Open navigation</span>
          </summary>
          <div className="absolute right-0 top-14 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            {links.map((link) => <Link key={link.href} href={link.href} className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{link.label}</Link>)}
            <Link href="/dashboard" className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">My application</Link>
            <Button asChild variant="gold" className="mt-2 w-full"><Link href="/apply">Apply now</Link></Button>
          </div>
        </details>
      </div>
    </header>
  );
}
