import Image from "next/image";
import Link from "next/link";

import { NewsletterForm } from "@/components/public/newsletter-form";
import { getContactDetails, getFooter } from "@/modules/content/content.queries";

const explore = [["/about", "About"], ["/funding", "Funding"], ["/eligibility", "Eligibility"], ["/how-to-apply", "How to apply"], ["/news", "News"], ["/resources", "Resources"]];
const support = [["/faq", "FAQs"], ["/contact", "Contact Us"], ["/portal", "Track application"], ["/terms", "Terms and conditions"], ["/privacy", "Privacy policy"]];

export async function SiteFooter() {
  const [content, contact] = await Promise.all([getFooter(), getContactDetails()]);
  return <footer className="bg-brand-orange text-white">
    <div className="container grid gap-9 py-12 md:grid-cols-[1.1fr_.7fr_.8fr_1.25fr]">
      <div><Image src="/brand/sme-fund-logo.svg" alt="SME Fund" width={185} height={42} className="h-11 w-auto brightness-0 invert" /><p className="mt-4 max-w-xs text-sm font-bold">{content.tagline}</p><p className="mt-2 max-w-xs text-sm leading-6 text-white/80">{content.summary}</p></div>
      <FooterLinks title="Explore" links={explore} />
      <FooterLinks title="Support" links={support} />
      <div><h2 className="text-base font-bold">{content.newsletterHeading}</h2><p className="mt-3 max-w-xs text-sm leading-5 text-white/80">{content.newsletterSummary}</p><NewsletterForm /></div>
    </div>
    <div className="container flex flex-col gap-2 border-t border-white/20 py-5 text-xs text-white/75 sm:flex-row sm:justify-between"><p>{content.copyright}</p><a href={`mailto:${contact.email}`} className="font-semibold hover:text-white">{contact.email}</a></div>
  </footer>;
}

function FooterLinks({ title, links }: { title: string; links: string[][] }) {
  return <div><h2 className="text-base font-bold">{title}</h2><nav className="mt-3 grid gap-2 text-sm text-white/80" aria-label={`${title} links`}>{links.map(([href, label]) => <Link href={href} key={href} className="hover:text-white hover:underline">{label}</Link>)}</nav></div>;
}
