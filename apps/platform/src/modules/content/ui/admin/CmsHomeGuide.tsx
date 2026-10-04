import type { AdminViewServerProps } from "payload";
import Link from "next/link";

import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { canAccessOperationsPortal } from "@/auth/authorization/portal-access";
import { getCurrentUser } from "@/auth/authorization/current-user";
import {
  hasCmsCapability,
  type CmsRequestUser,
} from "@/payload/access/can-access-cms";
import { CmsPageShell } from "./CmsPageShell";
import { CmsGuideImage } from "./CmsGuideImage";
import {
  buildHomeGuideSections,
  type GuideSection,
} from "./CmsHomeGuideSections";

function SectionCard({ section }: { section: GuideSection }) {
  return (
    <article
      className={
        section.image
          ? "cms-home-section cms-home-section--with-image"
          : "cms-home-section"
      }
    >
      {section.image ? <CmsGuideImage src={section.image} /> : null}
      <div>
        <h2>{section.title}</h2>
        <p className="cms-home-section__preview">{section.preview}</p>
        {section.detail ? <p>{section.detail}</p> : null}
        {section.target ? (
          <Link href={section.target}>Edit this section</Link>
        ) : (
          <p>
            {section.title === "Featured funding call"
              ? "Operations access is required to edit call details."
              : "Editing is unavailable with your current access."}
          </p>
        )}
        {section.secondaryTarget ? (
          <Link href={section.secondaryTarget}>
            {section.secondaryLabel ?? "Edit introduction"}
          </Link>
        ) : null}
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
  const canReadNews = hasCmsCapability(
    principal,
    cmsPermissionCode("news", "read"),
  );
  const canReadResources = hasCmsCapability(
    principal,
    cmsPermissionCode("resources", "read"),
  );
  const canReadEligibility = hasCmsCapability(
    principal,
    cmsPermissionCode("eligibility", "read"),
  );
  const canReadStatistics = hasCmsCapability(
    principal,
    cmsPermissionCode("statistics", "read"),
  );
  const canEditShared = canEdit;
  const [home, user, supportCards] = await Promise.all([
    req.payload.findGlobal({
      slug: "homepage",
      depth: 1,
      draft: true,
      overrideAccess: false,
      req,
    }),
    getCurrentUser(),
    canReadEligibility
      ? req.payload.find({
          collection: "eligibility-content",
          draft: true,
          limit: 50,
          overrideAccess: false,
          req,
          sort: "order",
          where: { kind: { equals: "criterion" } },
        })
      : Promise.resolve({ docs: [] }),
  ]);
  const sections = buildHomeGuideSections(
    home,
    canEdit,
    Boolean(user && canAccessOperationsPortal(user)),
  );

  return (
    <CmsPageShell view={view}>
      <main className="cms-home-guide">
        <p className="cms-home-guide__eyebrow">Website pages / Home</p>
        <h1>Home page</h1>
        <p>Select a section in the order it appears on the public page.</p>
        <p>
          Review: {home.reviewStatus ?? "draft"} · Live:{" "}
          {home._status ?? "draft"}
        </p>
        <div className="cms-home-guide__actions">
          <a href="/api/preview?path=%2F" target="_blank" rel="noreferrer">
            Preview page
          </a>
          <Link href="/api/preview/exit" target="_blank" rel="noreferrer">
            View live page
          </Link>
        </div>
        <div className="cms-home-guide__sections">
          {sections.map((section, index) => (
            <SectionCard key={`${section.title}-${index}`} section={section} />
          ))}
        </div>
        <section className="cms-home-guide__related">
          <h2>Related content</h2>
          {canReadNews ? (
            <Link href="/cms/collections/news">News articles</Link>
          ) : null}
          {canReadResources ? (
            <Link href="/cms/collections/resources">Resources</Link>
          ) : null}
          {canReadEligibility ? (
            <Link href="/cms/collections/eligibility-content">
              Support cards
            </Link>
          ) : null}
          {supportCards.docs.map((card) => (
            <Link
              key={card.id}
              href={`/cms/collections/eligibility-content/${card.id}`}
            >
              {card.label}
            </Link>
          ))}
          {canReadStatistics ? (
            <Link href="/cms/collections/programme-statistics">
              Programme statistics
            </Link>
          ) : null}
        </section>
        <section className="cms-home-guide__related">
          <h2>Appears on every page</h2>
          <p>Header and footer changes appear throughout the public website.</p>
          {canEditShared ? (
            <Link href="/cms/globals/header">Edit header</Link>
          ) : null}
          {canEditShared ? (
            <Link href="/cms/globals/footer">Edit footer</Link>
          ) : null}
        </section>
      </main>
    </CmsPageShell>
  );
}
