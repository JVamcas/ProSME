import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";

import { ContactForm } from "@/components/public/contact-form";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { getContactDetails, getPage } from "@/modules/content/ServerContentQueries";
import { contentMetadata } from "@/modules/content/ContentMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("contact");
  return page ? contentMetadata(page) : {};
}

export default async function ContactPage() {
  const [contact, page] = await Promise.all([
    getContactDetails(),
    getPage("contact"),
  ]);
  return (
    <>
      <PublicPageHeader
        eyebrow="Get in touch"
        image={page?.image}
        title={page?.title ?? ""}
        summary={page?.summary ?? ""}
      />
      <section className="section bg-brand-cream/30">
        <div className="container grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-brand-blue/25 bg-brand-white p-5 shadow-[0_12px_35px_rgba(10,24,59,0.08)]">
              <Mail className="size-6 text-brand-orange" />
              <h2 className="mt-3 font-bold text-brand-navy">Email</h2>
              <a
                href={`mailto:${contact.email}`}
                className="mt-1 block text-sm font-semibold text-brand-navy underline"
              >
                {contact.email}
              </a>
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className="mt-2 block text-sm font-semibold text-brand-navy underline"
                >
                  {contact.phone}
                </a>
              ) : null}
            </div>
            <div className="rounded-2xl border border-brand-blue/25 bg-brand-white p-5 shadow-[0_12px_35px_rgba(10,24,59,0.08)]">
              <MapPin className="size-6 text-brand-orange" />
              <h2 className="mt-3 font-bold text-brand-navy">
                Programme office
              </h2>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-brand-navy/75">
                {contact.address}
              </p>
              {contact.officeHours ? (
                <p className="mt-2 text-xs text-brand-navy/65">
                  {contact.officeHours}
                </p>
              ) : null}
            </div>
          </aside>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
