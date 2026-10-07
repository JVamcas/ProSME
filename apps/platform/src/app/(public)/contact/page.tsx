import type { Metadata } from "next";

import { ContactForm } from "@/components/public/contact-form";
import { PublicPageHeader } from "@/modules/content/ui/public/PublicPageHeader";
import { ContactDetailsCards } from "@/modules/content/ui/public/ContactDetailsCards";
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
          <ContactDetailsCards contact={contact} />
          <ContactForm />
        </div>
      </section>
    </>
  );
}
