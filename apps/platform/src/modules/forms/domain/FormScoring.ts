export const scoringMethods = [
  "SUM",
  "AVERAGE",
  "WEIGHTED_SUM",
  "WEIGHTED_AVERAGE",
] as const;

export type ScoringAggregate = {
  sources: { fieldKey: string; weight: number }[];
  method: (typeof scoringMethods)[number];
  missing: "REQUIRE_ALL" | "USE_AVAILABLE";
  normalization: "RAW" | "PERCENTAGE";
  precision: number;
};
