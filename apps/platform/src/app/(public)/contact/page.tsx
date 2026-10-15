import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { ArrowLink } from "@/shared/ui/Links";

import { ContactForm } from "@/modules/engagement/ui/public/ContactForm";
import { ContactDetailsCards } from "@/modules/content/ui/public/ContactDetailsCards";
import { PublicPageHeader } from "@/modules/content/ui/public/PublicPageHeader";
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
  const contact = await getContactDetails();
  return (
    <section className="bg-[#fdfbf7] py-8 sm:py-10">
      <div className="mx-auto w-[min(1440px,calc(100%-2rem))] sm:w-[min(1440px,calc(100%-5rem))]">
        <PublicPageHeader
          eyebrow="Get in touch"
          title="Let’s talk"
          summary="Have a question about the SME Fund? Get in touch with our team."
          variant="centered"
        />
        <div className="grid overflow-hidden rounded-2xl border border-brand-navy/15 bg-brand-white shadow-[0_8px_28px_rgba(10,24,59,0.05)] lg:grid-cols-[36%_64%]">
          <aside
            aria-labelledby="contact-details-heading"
            className="flex min-w-0 flex-col bg-[#fff7ea] p-6 sm:p-9 lg:p-11"
          >
            <h2
              id="contact-details-heading"
              className="mb-7 text-3xl font-bold tracking-tight text-brand-navy lg:text-4xl"
            >
              Contact details
            </h2>
            <ContactDetailsCards contact={contact} />
            <div className="mt-8 rounded-2xl bg-brand-navy p-6">
              <Scale
                className="mb-3 size-9 text-brand-orange"
                aria-hidden="true"
              />
              <h2 className="text-xl font-bold text-brand-white">
                Application appeals
              </h2>
              <p className="my-3 text-base leading-6 text-brand-white/90">
                Lodge an appeal using your application reference.
              </p>
              <ArrowLink
                href="/contact/appeal"
                className="whitespace-normal underline underline-offset-2"
              >
                Lodge an application appeal
              </ArrowLink>
            </div>
          </aside>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
