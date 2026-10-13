"use client";

import { useEffect } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import type { formFieldSchema } from "../../api/FormSchemas";
import type { FormField } from "../../FormTypes";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { GeneralButton } from "@/components/ui/button";

type Values = z.input<typeof formFieldSchema>;

export function ScoringAggregateSettings({
  fields,
}: {
  fields: readonly FormField[];
}) {
  const form = useFormContext<Values>();
  const sources = useFieldArray({
    control: form.control,
    name: "scoringAggregate.sources",
  });
  const method = useWatch({
    control: form.control,
    name: "scoringAggregate.method",
  });
  const scores = fields.filter((field) => field.type === "SCORE");
  useEffect(() => {
    if (!form.getValues("scoringAggregate")) {
      form.setValue("scoringAggregate", {
        sources: [],
        method: "WEIGHTED_AVERAGE",
        missing: "REQUIRE_ALL",
        normalization: "PERCENTAGE",
        precision: 2,
      });
    }
  }, [form]);
  const weighted = method === "WEIGHTED_AVERAGE" || method === "WEIGHTED_SUM";
  return (
    <fieldset className="space-y-4 rounded-xl border border-brand-navy/15 p-4">
      <legend className="px-2 font-bold">Score aggregation</legend>
      <FormSelect
        label="Calculation"
        name="scoringAggregate.method"
        items={[
          { label: "Sum", value: "SUM" },
          { label: "Average", value: "AVERAGE" },
          { label: "Weighted sum", value: "WEIGHTED_SUM" },
          { label: "Weighted average", value: "WEIGHTED_AVERAGE" },
        ]}
      />
      <FormSelect
        label="Score values"
        name="scoringAggregate.normalization"
        items={[
          { label: "Percentage of each score's maximum", value: "PERCENTAGE" },
          { label: "Original marks", value: "RAW" },
        ]}
      />
      <FormSelect
        label="Missing scores"
        name="scoringAggregate.missing"
        items={[
          { label: "Require every source score", value: "REQUIRE_ALL" },
          { label: "Calculate using available scores", value: "USE_AVAILABLE" },
        ]}
      />
      <FormInput
        label="Decimal places"
        name="scoringAggregate.precision"
        type="number"
        min={0}
        max={6}
      />
      {sources.fields.map((source, index) => (
        <div key={source.id} className="grid gap-3 sm:grid-cols-3">
          <FormSelect
            label="Score field"
            name={`scoringAggregate.sources.${index}.fieldKey`}
            items={scores.map((field) => ({
              label: field.label,
              value: field.key,
            }))}
            required
          />
          {weighted ? (
            <FormInput
              label="Weight"
              name={`scoringAggregate.sources.${index}.weight`}
              type="number"
              min={0.000001}
              step="any"
              required
            />
          ) : null}
          <GeneralButton
            type="button"
            variant="outline"
            onClick={() => sources.remove(index)}
          >
            Remove source
          </GeneralButton>
        </div>
      ))}
      <GeneralButton
        type="button"
        variant="outline"
        disabled={!scores.length}
        onClick={() => sources.append({ fieldKey: scores[0].key, weight: 1 })}
      >
        Add score source
      </GeneralButton>
      {!scores.length ? <p>Add Score fields to this form first.</p> : null}
      <p className="text-sm text-brand-navy/65">
        The result is calculated automatically and cannot be edited.
      </p>
    </fieldset>
  );
}
