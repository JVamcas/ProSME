import type { AdminViewServerProps } from "payload";
import Link from "next/link";

import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { canAccessOperationsPortal } from "@/auth/authorization/portal-access";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { hasCmsCapability, type CmsRequestUser } from "@/payload/access/can-access-cms";
import { CmsPageShell } from "./CmsPageShell";
import { CmsGuideImage } from "./CmsGuideImage";

type GuideSection = {
  title: string;
  preview: string;
  target?: string;
  secondaryTarget?: string;
  secondaryLabel?: string;
  detail?: string;
  image?: string;
};

function blockSection(block: Record<string, unknown>, index: number): GuideSection | null {
  if (block.blockType === "callToAction" && block.href === "/how-to-apply") {
    return null;
  }

  const names: Record<string, string> = {
    hero: "Additional hero",
    richText: "Additional text",
    callToAction: "Call to action",
    statistics: "Impact",
    resourceGrid: "News and resources",
    faqList: "Frequently asked questions",
  };
  const title = names[String(block.blockType)] ?? "Additional content";
  const heading = typeof block.heading === "string" ? block.heading : title;
  const image = block.backgroundImage ?? block.image;

  return {
    title,
    preview: heading,
    target: `/cms/globals/homepage#field-layout`,
    image: image && typeof image === "object" && "url" in image
      ? String(image.url)
      : undefined,
    detail: block.blockType === "statistics"
      ? `Homepage layout block ${index + 1}. Its own statistics override published programme statistics; an empty list uses those records.`
      : `Homepage layout block ${index + 1}. Open Layout and select this ${title.toLowerCase()} block.`,
  };
}

function SectionCard({ section }: { section: GuideSection }) {
  return (
    <article
      className={section.image
        ? "cms-home-section cms-home-section--with-image"
        : "cms-home-section"}
    >
      {section.image ? (
        <CmsGuideImage src={section.image} />
      ) : null}
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
  const canEdit = hasCmsCapability(principal, cmsPermissionCode("site-settings", "update"));
  const canReadNews = hasCmsCapability(principal, cmsPermissionCode("news", "read"));
  const canReadResources = hasCmsCapability(principal, cmsPermissionCode("resources", "read"));
  const canReadEligibility = hasCmsCapability(principal, cmsPermissionCode("eligibility", "read"));
  const canReadStatistics = hasCmsCapability(principal, cmsPermissionCode("statistics", "read"));
  const canEditShared = canEdit;
  const [home, user, supportCards] = await Promise.all([
    req.payload.findGlobal({ slug: "homepage", depth: 1, draft: true, overrideAccess: false, req }),
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
  const blocks = (home.layout ?? []) as Record<string, unknown>[];
  const resourceBlocks = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.blockType === "resourceGrid");
  const remainingBlocks = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.blockType !== "resourceGrid");
  const sections: GuideSection[] = [
    {
      title: "Hero",
      preview: home.title ?? "Home hero",
      image: typeof home.heroImage === "object" && home.heroImage ? home.heroImage.url ?? undefined : undefined,
      detail: home.summary ?? "Headline, image, buttons and benefit captions.",
      target: canEdit ? "/cms/globals/homepage#field-title" : undefined,
    },
    {
      title: "Three action cards",
      preview: home.actionCards?.fundingTitle ?? "I want funding",
      detail: "Funding, eligibility and application tracking cards. Their destinations are fixed website links.",
      target: canEdit ? "/cms/globals/homepage#field-actionCards" : undefined,
    },
    {
      title: "Featured funding call",
      preview: "Current open funding opportunity",
      detail: "Call details, amounts and dates are managed in operations.",
      target: user && canAccessOperationsPortal(user) ? "/admin/funding-calls" : undefined,
      secondaryTarget: canEdit ? "/cms/globals/homepage#field-fundingSlogan" : undefined,
      secondaryLabel: "Edit Home slogan",
    },
    ...resourceBlocks.flatMap(({ block, index }) => {
      const section = blockSection(block, index);
      if (!section) return [];

      return [{
        ...section,
        target: canEdit ? section.target : undefined,
        secondaryTarget: canEdit
          ? "/cms/globals/homepage#field-newsIntroduction"
          : undefined,
        detail: "Home automatically shows the latest two published news articles and two published resources. Edit individual items in their collections.",
      }];
    }),
    {
      title: "How it works",
      preview: home.process?.heading ?? "How it works",
      detail: home.process?.introduction ?? "Four application steps.",
      target: canEdit ? "/cms/globals/homepage#field-process" : undefined,
    },
    {
      title: "Who we support",
      preview: home.supportHeading ?? "Who we support",
      detail: home.supportIntroduction ?? "Support cards are eligibility content entries.",
      target: canEdit ? "/cms/globals/homepage#field-supportHeading" : undefined,
    },
    ...remainingBlocks.flatMap(({ block, index }) => {
      const section = blockSection(block, index);
      return section ? [{ ...section, target: canEdit ? section.target : undefined }] : [];
    }),
  ];

  return (
    <CmsPageShell view={view}>
      <main className="cms-home-guide">
        <p className="cms-home-guide__eyebrow">Website pages / Home</p>
        <h1>Home page</h1>
        <p>Select a section in the order it appears on the public page.</p>
        <p>
          Review: {home.reviewStatus ?? "draft"} · Live: {home._status ?? "draft"}
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
          {canReadNews ? <Link href="/cms/collections/news">News articles</Link> : null}
          {canReadResources ? (
            <Link href="/cms/collections/resources">Resources</Link>
          ) : null}
          {canReadEligibility ? (
            <Link href="/cms/collections/eligibility-content">Support cards</Link>
          ) : null}
          {supportCards.docs.map((card) => (
            <Link key={card.id} href={`/cms/collections/eligibility-content/${card.id}`}>
              {card.label}
            </Link>
          ))}
          {canReadStatistics ? (
            <Link href="/cms/collections/programme-statistics">Programme statistics</Link>
          ) : null}
        </section>
        <section className="cms-home-guide__related">
          <h2>Appears on every page</h2>
          <p>Header and footer changes appear throughout the public website.</p>
          {canEditShared ? <Link href="/cms/globals/header">Edit header</Link> : null}
          {canEditShared ? <Link href="/cms/globals/footer">Edit footer</Link> : null}
        </section>
      </main>
    </CmsPageShell>
  );
}
