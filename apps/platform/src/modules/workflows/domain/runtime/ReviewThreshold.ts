export type ReviewThresholdRule = {
  mode: "ALL" | "COUNT" | "PERCENT";
  count: number;
  percentage: number | null;
  rounding: "CEIL";
};

export function requiredReviewCompletions(
  rule: ReviewThresholdRule,
  denominator: number,
): number {
  if (!Number.isInteger(denominator) || denominator < 1) {
    throw new Error("Review threshold requires at least one slot.");
  }
  if (rule.mode === "ALL") return denominator;
  if (rule.mode === "COUNT") return rule.count;
  if (rule.percentage === null || rule.percentage < 1 || rule.percentage > 100) {
    throw new Error("Invalid review completion percentage.");
  }
  return Math.ceil(denominator * rule.percentage / 100);
}
