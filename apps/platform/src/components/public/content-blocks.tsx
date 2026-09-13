import Link from "next/link";

import { CmsImage } from "./cms-image";
import { CmsRichText } from "@/components/ui/cms-rich-text";
import { HomeFunding } from "./home-funding";
import { StatisticsBlock } from "./statistics-block";
import { getFaqs } from "@/modules/content/ServerContentQueries";

type Block = Record<string, unknown> & { blockType?: string };

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
    return <StatisticsBlock block={block} key={key} />;
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

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
function number(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
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
