export type FundingIconKey = "grant" | "mentorship" | "market" | "innovation" | "inclusive" | "growth" | "impact";
export type FundingCardContent = { description: string; icon: FundingIconKey; title: string };
export type FundingSupportContent = { cards: FundingCardContent[]; description: string; eyebrow: string; heading: string; uses: string[] };
export type FundingPrioritiesContent = { eyebrow: string; heading: string; items: FundingCardContent[] };

export const defaultFundingSupport: FundingSupportContent = {
  eyebrow: "What the fund supports",
  heading: "Investment in sustainable growth",
  description: "Funding is not intended to simply cover routine operating costs, but to promote growth, competitiveness, and MSMEs’ contribution to Namibia's economic transformation.",
  uses: [
    "Equipment and productive assets",
    "Market expansion and export readiness",
    "Product or service innovation",
    "Business systems and operational improvements",
    "Activities that support sustainable job creation",
  ],
  cards: [
    { description: "Growth and expansion capital", icon: "grant", title: "Grant funding" },
    { description: "Practical coaching and advice", icon: "mentorship", title: "Mentorship" },
    { description: "Linkages and export readiness", icon: "market", title: "Market access" },
    { description: "Support to compete and adapt", icon: "innovation", title: "Innovation" },
  ],
};

export const defaultFundingPriorities: FundingPrioritiesContent = {
  eyebrow: "Priority applicants",
  heading: "Built for entrepreneurs creating value",
  items: [
    { description: "Youth-owned and women-owned enterprises are encouraged to apply.", icon: "inclusive", title: "Inclusive ownership" },
    { description: "Existing businesses seeking expansion, improvement or access to new markets.", icon: "growth", title: "Ready to grow" },
    { description: "Enterprises with the potential to innovate, create employment and diversify the economy.", icon: "impact", title: "Economic impact" },
  ],
};

export function fundingPageSections(blocks: unknown[]) {
  const records = blocks.filter((block): block is Record<string, unknown> => Boolean(block) && typeof block === "object");
  return {
    priorities: parsePriorities(records.find((block) => block.blockType === "fundingPriorities")),
    support: parseSupport(records.find((block) => block.blockType === "fundingSupport")),
  };
}

function parseSupport(block?: Record<string, unknown>): FundingSupportContent {
  if (!block) return defaultFundingSupport;
  return { cards: cards(block.cards, defaultFundingSupport.cards), description: text(block.description, defaultFundingSupport.description), eyebrow: text(block.eyebrow, defaultFundingSupport.eyebrow), heading: text(block.heading, defaultFundingSupport.heading), uses: labels(block.uses, defaultFundingSupport.uses) };
}

function parsePriorities(block?: Record<string, unknown>): FundingPrioritiesContent {
  if (!block) return defaultFundingPriorities;
  return { eyebrow: text(block.eyebrow, defaultFundingPriorities.eyebrow), heading: text(block.heading, defaultFundingPriorities.heading), items: cards(block.items, defaultFundingPriorities.items) };
}

function cards(value: unknown, fallback: FundingCardContent[]) {
  if (!Array.isArray(value)) return fallback;
  const parsed = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (typeof record.title !== "string" || typeof record.description !== "string" || !isIcon(record.icon)) return [];
    return [{ description: record.description, icon: record.icon, title: record.title }];
  });
  return parsed.length ? parsed : fallback;
}

function labels(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const parsed = value.flatMap((item) => item && typeof item === "object" && "label" in item && typeof item.label === "string" ? [item.label] : []);
  return parsed.length ? parsed : fallback;
}

function text(value: unknown, fallback: string) { return typeof value === "string" && value ? value : fallback; }
function isIcon(value: unknown): value is FundingIconKey { return ["grant", "mentorship", "market", "innovation", "inclusive", "growth", "impact"].includes(String(value)); }
