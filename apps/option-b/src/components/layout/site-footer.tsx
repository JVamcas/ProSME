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
      <div className="border-t border-slate-200 bg-white">
        {/* <div className="container flex flex-col items-center justify-between gap-6 py-6 md:flex-row">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#62a9d0]">
            A stronger
            <br />
            tomorrow together
          </p>
          <div className="flex flex-wrap items-center justify-center gap-7">
            <Image
              src="/brand/npc-logo.png"
              alt="National Planning Commission"
              width={46}
              height={46}
              className="size-11 object-contain"
            />
            <Image
              src="/brand/giz-logo.svg"
              alt="GIZ"
              width={154}
              height={40}
            />
            <Image
              src="/brand/nipdb-logo.png"
              alt="NIPDB"
              width={125}
              height={40}
              className="h-9 w-auto object-contain"
            />
            <span className="hidden h-12 border-l border-slate-300 sm:block" />
            <Image
              src="/brand/ProSME-logo-with-tagline.svg"
              alt="ProSME"
              width={125}
              height={48}
              className="h-11 w-auto"
            />
          </div>
        </div> */}
      </div>
      <div className="bg-gradient-to-r from-[#092a4b] to-[#071c36] text-white">
        <div className="container grid gap-9 py-10 md:grid-cols-[1.1fr_.65fr_.75fr_1.2fr]">
          <div>
            <Image
              src="/brand/sme-fund-logo.svg"
              alt="SME Fund"
              width={185}
              height={42}
              className="h-10 w-auto brightness-0 invert"
            />
            <p className="mt-3 text-sm leading-5 text-white/70">
              Funding today.
              <br />A stronger tomorrow.
            </p>
            <div className="mt-5 flex gap-2">
              {["in", "f", "▶", "◎"].map((label) => (
                <span
                  key={label}
                  className="grid size-7 place-items-center rounded bg-white/10 text-[11px] font-bold"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold">Quick links</h2>
            <div className="mt-3 grid gap-1.5 text-xs text-white/70">
              {quickLinks.map(([href, label]) => (
                <Link href={href} key={label}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold">Support</h2>
            <div className="mt-3 grid gap-1.5 text-xs text-white/70">
              <span>FAQs</span>
              <span>Contact Us</span>
              <span>Application Support</span>
              <span>Terms & Conditions</span>
              <span>Privacy Policy</span>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold">Stay in the loop</h2>
            <p className="mt-3 max-w-xs text-xs leading-4 text-white/70">
              Get the latest funding opportunities, updates and business
              resources.
            </p>
            <div className="mt-4 flex rounded-full bg-white p-1">
              <input
                aria-label="Email address"
                placeholder="Your email address"
                className="min-w-0 flex-1 bg-transparent px-4 text-xs text-navy outline-none placeholder:text-slate-400"
              />
              <button className="home-primary min-h-10 shrink-0 px-5 text-xs">
                Subscribe <ArrowRight className="size-3" />
              </button>
            </div>
          </div>
        </div>
        <div className="container flex flex-col gap-2 border-t border-white/10 py-5 text-[10px] text-white/50 sm:flex-row sm:justify-between">
          <p>© 2025 SME Fund Namibia. All rights reserved.</p>
          <p>
            A ProSME Project initiative &nbsp; | &nbsp; Building a more
            competitive and inclusive Namibia.
          </p>
        </div>
      </div>
    </footer>
  );
}
