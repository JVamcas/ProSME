import { z } from "zod";
import { scoringMethods } from "../domain/FormScoring";

export const scoringAggregateSchema = z.object({
  sources: z
    .array(
      z.object({
        fieldKey: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
        weight: z.coerce.number().finite().positive(),
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (sources) =>
        new Set(sources.map((source) => source.fieldKey)).size ===
        sources.length,
      "Select each score field only once.",
    ),
  method: z.enum(scoringMethods),
  missing: z.enum(["REQUIRE_ALL", "USE_AVAILABLE"]),
  normalization: z.enum(["RAW", "PERCENTAGE"]),
  precision: z.coerce.number().int().min(0).max(6),
});
