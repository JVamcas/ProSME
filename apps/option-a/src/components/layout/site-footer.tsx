import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const quickLinks = [
  ["Home", "/"], ["About", "/#about"], ["Funding Opportunities", "/funding"],
  ["Eligibility", "/eligibility"], ["How to Apply", "/how-to-apply"],
  ["Resources", "/#resources"], ["News", "/#news"],
];

const supportLinks = [
  ["FAQs", "/how-to-apply"], ["Contact Us", "mailto:info@smefund.na"],
  ["Terms of Use", "#"], ["Privacy Policy", "#"], ["Accessibility", "#"],
];

export function SiteFooter() {
  return (
    <footer className="bg-[#063764] text-white">
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_.75fr_.8fr_1.35fr]">
        <div><Logo inverted className="mt-2" /></div>
        <div><h2 className="text-sm font-bold">Quick links</h2><nav className="mt-4 grid gap-1.5 text-xs text-white/75">{quickLinks.map(([label, href]) => <Link key={label} href={href} className="hover:text-[#ffca45]">{label}</Link>)}</nav></div>
        <div><h2 className="text-sm font-bold">Support</h2><nav className="mt-4 grid gap-1.5 text-xs text-white/75">{supportLinks.map(([label, href]) => <Link key={label} href={href} className="hover:text-[#ffca45]">{label}</Link>)}</nav></div>
        <div>
          <h2 className="text-sm font-bold">Subscribe for updates</h2>
          <p className="mt-3 text-xs leading-5 text-white/70">Get the latest funding opportunities and news directly to your inbox.</p>
          <form className="mt-4 flex gap-2"><label className="sr-only" htmlFor="footer-email">Your email address</label><input id="footer-email" type="email" placeholder="Your email address" className="min-w-0 flex-1 rounded-md bg-white px-4 py-2.5 text-xs text-slate-900 outline-none ring-[#ffca45] focus:ring-2" /><button type="submit" className="rounded-md bg-[#efb538] px-5 text-xs font-bold text-navy">Subscribe</button></form>
          <div className="mt-5 flex gap-3 text-white/85">
            <Link href="#" aria-label="LinkedIn" className="grid size-6 place-items-center rounded-sm bg-white/90 text-[11px] font-black text-[#063764]">in</Link>
            <Link href="#" aria-label="Facebook" className="grid size-6 place-items-center rounded-sm bg-white/90 text-sm font-black text-[#063764]">f</Link>
            <Link href="#" aria-label="YouTube" className="grid size-6 place-items-center rounded-sm bg-white/90 text-[10px] font-black text-[#063764]">▶</Link>
          </div>
        </div>
      </div>
      <div className="container border-t border-white/20 py-5 text-[11px] text-white/60">
        <div className="flex flex-col justify-between gap-3 sm:flex-row"><p>© 2025 SME Fund. All rights reserved.</p><p>An initiative under the ProSME Project&nbsp;&nbsp; | &nbsp;&nbsp;Implemented by NIPDB&nbsp;&nbsp; | &nbsp;&nbsp;Supported by GIZ</p></div>
      </div>
    </footer>
  );
}
