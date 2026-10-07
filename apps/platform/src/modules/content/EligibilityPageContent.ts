import type { EligibilityItem } from "./ContentTypes";

export type EligibilityFocusSection = {
  eyebrow: string;
  heading: string;
  notice: string;
  noticeHeading: string;
};

export function eligibilityFocusSectorItems(blocks: unknown[]): EligibilityItem[] {
  const block = blocks.find(isFocusBlock);
  if (!Array.isArray(block?.sectors)) return [];
  return block.sectors.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const { label, description } = value as Record<string, unknown>;
    if (typeof label !== "string") return [];
    return [{
      label,
      description: typeof description === "string" ? description : "",
      kind: "focusSector" as const,
    }];
  });
}

export const defaultEligibilityFocusSection: EligibilityFocusSection = {
  eyebrow: "Focus sectors",
  heading: "Priority areas for consideration",
  noticeHeading: "MSMEs in all sectors are encouraged to apply.",
  notice: "The sectors above only indicate priority areas; this is not an exclusion list.",
};

export function eligibilityFocusSection(blocks: unknown[]): EligibilityFocusSection {
  const block = blocks.find(isFocusBlock);
  if (!block) return defaultEligibilityFocusSection;
  return {
    eyebrow: text(block.eyebrow, defaultEligibilityFocusSection.eyebrow),
    heading: text(block.heading, defaultEligibilityFocusSection.heading),
    notice: text(block.notice, defaultEligibilityFocusSection.notice),
    noticeHeading: text(block.noticeHeading, defaultEligibilityFocusSection.noticeHeading),
  };
}

function isFocusBlock(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && "blockType" in value && value.blockType === "eligibilityFocusSectors");
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}
