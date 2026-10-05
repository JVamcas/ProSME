import type { AdminViewServerProps } from "payload";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { cmsPermissionCode } from "@/auth/authorization/permissions";
import {
  hasCmsCapability,
  type CmsRequestUser,
} from "@/payload/access/can-access-cms";
import { CmsPageHeader } from "./CmsPageHeader";
import { CmsGuideImage } from "./CmsGuideImage";
import {
  buildHomeGuideSections,
  type GuideSection,
} from "./CmsHomeGuideSections";

function SectionCard({ section }: { section: GuideSection }) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-solid border-brand-navy/15 bg-brand-white p-5 shadow-sm",
        section.image && "grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)]",
      )}
    >
      {section.image ? <CmsGuideImage src={section.image} /> : null}
      <div>
        <h2 className="m-0 text-2xl font-semibold text-brand-navy">
          {section.title}
        </h2>
        <p className="my-1 font-bold text-brand-navy">{section.preview}</p>
        {section.detail ? <p>{section.detail}</p> : null}
        {section.target ? (
          <Link
            href={section.target}
            className="mt-2 inline-flex font-bold text-brand-navy underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-orange"
          >
            Edit this section
          </Link>
        ) : (
          <p>Editing is unavailable with your current access.</p>
        )}
      </div>
    </article>
  );
}

export default async function CmsHomeGuide(view: AdminViewServerProps) {
  const { initPageResult } = view;
  const req = initPageResult.req;
  const principal = req.user as CmsRequestUser;
  const canEdit = hasCmsCapability(
    principal,
    cmsPermissionCode("site-settings", "update"),
  );
  const home = await req.payload.findGlobal({
    slug: "homepage",
    depth: 1,
    draft: true,
    overrideAccess: false,
    req,
  });
  const sections = buildHomeGuideSections(home, canEdit);

  return (
    <main className="box-border w-full p-4 pb-12 text-brand-navy sm:p-8 sm:pb-18">
      <CmsPageHeader eyebrow="Website pages / Home" title="Home page" />
      <div className="my-7 grid gap-4">
        {sections.map((section, index) => (
          <SectionCard key={`${section.title}-${index}`} section={section} />
        ))}
      </div>
    </main>
  );
}
