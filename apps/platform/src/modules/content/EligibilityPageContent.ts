export type EligibilityFocusSection = {
  eyebrow: string;
  heading: string;
  notice: string;
  noticeHeading: string;
};

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
