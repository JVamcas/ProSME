import type { FormField } from "../FormTypes";
import { scoringAggregateSchema } from "../api/FormScoringSchemas";

export function formScoringErrors(fields: readonly FormField[]): string[] {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  return fields.flatMap((field) => {
    if (
      field.type === "SCORE" &&
      (!Number.isFinite(field.minimum) ||
        !Number.isFinite(field.maximum) ||
        field.minimum! < 0 ||
        field.maximum! <= field.minimum!)
    ) {
      return [
        `${field.label}: scores need a nonnegative minimum and a larger maximum.`,
      ];
    }
    if (field.type !== "SCORING_AGGREGATE") {
      return field.scoringAggregate
        ? [`${field.label}: only aggregates can define scoring sources.`]
        : [];
    }
    const parsed = scoringAggregateSchema.safeParse(field.scoringAggregate);
    if (!parsed.success)
      return [
        `${field.label}: configure valid scoring sources and calculation settings.`,
      ];
    if (
      parsed.data.sources.some(
        (source) => byKey.get(source.fieldKey)?.type !== "SCORE",
      )
    ) {
      return [
        `${field.label}: every source must be a Score field in this form.`,
      ];
    }
    return [];
  });
}

// Aggregates never consume submitted aggregate values or other aggregates.
export function calculateFormScores(
  fields: readonly FormField[],
  values: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const result = { ...values };
  const byKey = new Map(fields.map((field) => [field.key, field]));
  for (const field of fields) {
    if (field.type !== "SCORING_AGGREGATE") continue;
    delete result[field.key];
    const parsed = scoringAggregateSchema.safeParse(field.scoringAggregate);
    if (!parsed.success) continue;
    const config = parsed.data;
    const scores = config.sources.flatMap((source) => {
      const definition = byKey.get(source.fieldKey);
      const value = values[source.fieldKey];
      if (
        definition?.type !== "SCORE" ||
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        !Number.isFinite(definition.minimum) ||
        !Number.isFinite(definition.maximum) ||
        value < definition.minimum! ||
        value > definition.maximum! ||
        definition.maximum! <= definition.minimum!
      )
        return [];
      return [
        {
          value:
            config.normalization === "PERCENTAGE"
              ? (value / definition.maximum!) * 100
              : value,
          weight: source.weight,
        },
      ];
    });
    if (
      !scores.length ||
      (config.missing === "REQUIRE_ALL" &&
        scores.length !== config.sources.length)
    )
      continue;
    const weighted =
      config.method === "WEIGHTED_SUM" || config.method === "WEIGHTED_AVERAGE";
    const total = scores.reduce(
      (sum, score) => sum + score.value * (weighted ? score.weight : 1),
      0,
    );
    const divisor =
      config.method === "AVERAGE"
        ? scores.length
        : config.method === "WEIGHTED_AVERAGE"
          ? scores.reduce((sum, score) => sum + score.weight, 0)
          : 1;
    const value = total / divisor;
    if (Number.isFinite(value))
      result[field.key] = Number(value.toFixed(config.precision));
  }
  return result;
}
