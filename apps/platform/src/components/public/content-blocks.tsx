import Link from "next/link";
import { Banknote, FileText, MapPinned, Users } from "lucide-react";

import { CmsImage } from "./cms-image";
import { CmsRichText } from "./cms-rich-text";
import { HomeFunding } from "./home-funding";
import { getFaqs, getStatistics } from "@/modules/content/content.queries";

type Block = Record<string, unknown> & { blockType?: string };

const statisticIcons = [FileText, MapPinned, Banknote, Users];

export async function ContentBlocks({ blocks }: { blocks: unknown[] }) {
  return (
    <>
      {await Promise.all(
        blocks.map((block, index) => renderBlock(block as Block, index)),
      )}
    </>
  );
}

async function renderBlock(block: Block, index: number) {
  const key = `${block.blockType}-${index}`;
  if (isRemovedEligibilityBanner(block)) return null;
  if (block.blockType === "hero")
    return (
      <section className="section bg-navy text-white" key={key}>
        <div className="container grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-orange">
              {text(block.eyebrow)}
            </p>
            <h2 className="display mt-3 text-4xl font-semibold">
              {text(block.heading)}
            </h2>
            <p className="mt-4 text-white/70">{text(block.summary)}</p>
          </div>
          <CmsImage
            className="aspect-[4/3] rounded-3xl object-cover"
            image={image(block.image)}
          />
        </div>
      </section>
    );
  if (block.blockType === "richText" && block.content)
    return (
      <section className="section" key={key}>
        <div className="container max-w-3xl">
          <CmsRichText
            data={block.content as Parameters<typeof CmsRichText>[0]["data"]}
          />
        </div>
      </section>
    );
  if (block.blockType === "callToAction")
    return (
      <section className="bg-orange-pale py-12" key={key}>
        <div className="container flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="display text-3xl font-semibold text-navy">
              {text(block.heading)}
            </h2>
            <p className="mt-2 text-slate-600">{text(block.summary)}</p>
          </div>
          <Link className="home-primary" href={text(block.href)}>
            {text(block.label)}
          </Link>
        </div>
      </section>
    );
  if (block.blockType === "statistics")
    return <Statistics block={block} key={key} />;
  if (block.blockType === "resourceGrid")
    return <ResourceGrid block={block} key={key} />;
  if (block.blockType === "faqList") return <FaqList block={block} key={key} />;
  return null;
}

async function ResourceGrid({ block }: { block: Block }) {
  return (
    <HomeFunding
      heading={text(block.heading) || "Latest News & Resources"}
      limit={number(block.limit, 4)}
    />
  );
}

async function FaqList({ block }: { block: Block }) {
  const category = text(block.category);
  const faqs = (await getFaqs()).filter(
    (item) => !category || item.category === category,
  );
  return (
    <section className="section bg-slate-50" aria-labelledby="block-faqs">
      <div className="container max-w-3xl">
        <h2
          className="display text-3xl font-semibold text-navy"
          id="block-faqs"
        >
          {text(block.heading)}
        </h2>
        <div className="mt-6 space-y-3">
          {faqs.map((item) => (
            <details className="card p-5" key={item.id}>
              <summary className="cursor-pointer font-bold text-navy">
                {item.question}
              </summary>
              <div className="mt-4">
                <CmsRichText data={item.answer} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

async function Statistics({ block }: { block: Block }) {
  const configured = records(block.items);
  const items = configured.length ? configured : await getStatistics();
  return (
    <section className="relative overflow-hidden bg-brand-white py-8 text-brand-navy">
      <CmsImage
        className="absolute inset-0 h-full w-full object-cover object-center"
        image={image(block.backgroundImage)}
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.94)_0%,rgba(255,255,255,.78)_42%,rgba(255,255,255,.12)_82%)]" />
      <div className="hero-container relative z-10">
        <h2 className="text-3xl font-bold">
          {impactHeading(text(block.heading))}
        </h2>
        <p className="mt-1 text-sm text-brand-navy/80">
          {text(block.summary) ||
            "Together, we’re building a more competitive Namibia that supports MSME growth."}
        </p>
        <div className="mt-7 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          {items.map((item, itemIndex) => {
            const Icon = statisticIcons[itemIndex % statisticIcons.length];
            return (
              <div
                className="border-r border-brand-orange/35 last:border-0"
                key={itemIndex}
              >
                <Icon aria-hidden="true" className="size-7 text-brand-orange" />
                <strong className="mt-2 block text-2xl text-brand-navy">
                  {text(item.value)}
                </strong>
                <p className="text-xs text-brand-navy/80">{text(item.label)}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="campaign-script absolute right-[4%] top-1/2 hidden w-[230px] -translate-y-1/2 rotate-[-6deg] text-right text-[clamp(1.65rem,2vw,2.35rem)] leading-[.98] text-brand-white [text-shadow:0_2px_5px_rgba(0,0,0,.55)] lg:block"
      >
        Small
        <br />
        Businesses.
        <br />A Brighter
        <br />
        Namibia
        <span className="ml-auto mt-2 block h-1.5 w-28 rotate-[-4deg] rounded-full bg-brand-yellow" />
      </div>
    </section>
  );
}

function impactHeading(heading: string) {
  return !heading || heading === "A nationwide commitment to MSME growth"
    ? "Real businesses, lasting impact."
    : heading;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
function number(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}
function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
    : [];
}
function image(value: unknown) {
  return value && typeof value === "object" && "url" in value
    ? (value as Parameters<typeof CmsImage>[0]["image"])
    : undefined;
}
function isRemovedEligibilityBanner(block: Block) {
  return (
    block.blockType === "callToAction" &&
    text(block.href) === "/eligibility" &&
    text(block.heading) === "Start with an eligibility check"
  );
}
