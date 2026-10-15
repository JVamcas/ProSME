import type { Metadata } from "next";
import { PublicPageHeader } from "@/modules/content/ui/public/PublicPageHeader";
import { PublicApplicationAppealForm } from "@/modules/applications/ui/appeals/PublicApplicationAppealForm";
export const metadata: Metadata = { title: "Lodge an application appeal" };
export default function ApplicationAppealPage() {
  return (
    <>
      <PublicPageHeader
        title="Lodge an application appeal"
        eyebrow="Contact Us"
        summary="Submit an appeal using your application reference. No portal account required."
      />
      <section className="section bg-brand-cream/30">
        <div className="container max-w-4xl">
          <PublicApplicationAppealForm />
        </div>
      </section>
    </>
  );
}
