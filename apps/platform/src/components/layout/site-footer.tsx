import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const quickLinks = [
  ["/", "Home"],
  ["/funding", "Funding"],
  ["/eligibility", "Eligibility"],
  ["/how-to-apply", "How to Apply"],
  ["/funding", "Resources"],
  ["/how-to-apply", "About"],
];

export function SiteFooter() {
  return (
    <footer>
      <div className="bg-gradient-to-r from-[#ff6f00] to-[#d95e00] text-white">
        <div className="container grid gap-9 py-10 md:grid-cols-[1.1fr_.65fr_.75fr_1.2fr]">
          <FooterBrand />
          <FooterLinks />
          <FooterSupport />
          <FooterNewsletter />
        </div>
        <div className="container flex flex-col gap-2 border-t border-white/10 py-5 text-[10px] text-white/50 sm:flex-row sm:justify-between">
          <p>© 2026 SME Fund Namibia. All rights reserved.</p>
          <p>
            A ProSME Project initiative &nbsp; | &nbsp; Building a more
            competitive and inclusive Namibia.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterBrand() {
  return (
    <div>
      <Image
        src="/brand/sme-fund-logo.svg"
        alt="SME Fund"
        width={185}
        height={42}
        className="h-10 w-auto brightness-0 invert"
      />
      <p className="mt-3 text-sm leading-5 text-white/70">
        Funding today.<br />A stronger tomorrow.
      </p>
      <div className="mt-5 flex gap-2">
        {["in", "f", "▶", "◎"].map((label) => (
          <span key={label} className="grid size-7 place-items-center rounded bg-white/10 text-[11px] font-bold">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function FooterLinks() {
  return (
    <div>
      <h2 className="text-sm font-bold">Quick links</h2>
      <div className="mt-3 grid gap-1.5 text-xs text-white/70">
        {quickLinks.map(([href, label]) => (
          <Link href={href} key={label}>{label}</Link>
        ))}
      </div>
    </div>
  );
}

function FooterSupport() {
  return (
    <div>
      <h2 className="text-sm font-bold">Support</h2>
      <div className="mt-3 grid gap-1.5 text-xs text-white/70">
        <span>FAQs</span>
        <span>Contact Us</span>
        <span>Application Support</span>
        <span>Terms &amp; Conditions</span>
        <span>Privacy Policy</span>
      </div>
    </div>
  );
}

function FooterNewsletter() {
  return (
    <div>
      <h2 className="text-sm font-bold">Stay in the loop</h2>
      <p className="mt-3 max-w-xs text-xs leading-4 text-white/70">
        Get the latest funding opportunities, updates and business resources.
      </p>
      <div className="mt-4 flex rounded-full bg-white p-1">
        <input
          aria-label="Email address"
          placeholder="Your email address"
          className="min-w-0 flex-1 bg-transparent px-4 text-xs text-navy outline-none placeholder:text-slate-400"
        />
        <button type="button" className="home-primary min-h-10 shrink-0 px-5 text-xs">
          Subscribe <ArrowRight className="size-3" />
        </button>
      </div>
    </div>
  );
}
