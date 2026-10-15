import type { Metadata } from "next";
import { ArrowLink } from "@/shared/ui/Links";

import { ContactForm } from "@/components/public/contact-form";
import { PublicPageHeader } from "@/modules/content/ui/public/PublicPageHeader";
import { ContactDetailsCards } from "@/modules/content/ui/public/ContactDetailsCards";
import {
  getContactDetails,
  getPage,
} from "@/modules/content/ServerContentQueries";
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
          <ContactDetailsCards contact={contact} />
          <div className="space-y-6">
            <div className="rounded-xl border border-brand-blue/25 bg-white p-6">
              <h2 className="text-xl font-bold text-brand-navy">
                Application appeals
              </h2>
              <p className="my-3 text-brand-navy/75">
                Lodge an appeal using your application reference. No portal
                account required.
              </p>
              <ArrowLink href="/contact/appeal">
                Lodge an application appeal
              </ArrowLink>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
