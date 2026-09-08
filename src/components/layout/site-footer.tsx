import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.2fr_.8fr_1fr]">
        <div><Logo inverted /><p className="mt-5 max-w-sm text-sm leading-6 text-white/65">An initiative under the ProSME Project, enabling Namibian enterprises to grow, innovate and create sustainable employment.</p></div>
        <div><h2 className="text-sm font-bold uppercase tracking-wider text-gold">Explore</h2><div className="mt-4 grid gap-3 text-sm text-white/70"><Link href="/funding">Funding opportunity</Link><Link href="/eligibility">Check eligibility</Link><Link href="/how-to-apply">How to apply</Link><Link href="/dashboard">Applicant dashboard</Link></div></div>
        <div><h2 className="text-sm font-bold uppercase tracking-wider text-gold">Get in touch</h2><div className="mt-4 grid gap-3 text-sm text-white/70"><span className="flex gap-3"><Mail className="size-4 shrink-0 text-sky" />info@smefund.na</span><span className="flex gap-3"><Phone className="size-4 shrink-0 text-sky" />Telephone to be confirmed</span><span className="flex gap-3"><MapPin className="size-4 shrink-0 text-sky" />Windhoek, Namibia</span></div></div>
      </div>
      <div className="border-t border-white/10"><div className="container flex flex-col gap-2 py-5 text-xs text-white/45 sm:flex-row sm:justify-between"><p>© 2026 SME Fund. Prototype for demonstration.</p><p>Implemented by NIPDB in partnership with NPC, supported by GIZ.</p></div></div>
    </footer>
  );
}
