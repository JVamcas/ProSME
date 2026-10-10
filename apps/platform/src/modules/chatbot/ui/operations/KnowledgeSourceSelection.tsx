"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { GeneralButton } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { FormMultiSelect } from "@/shared/ui/FormMultiSelect";
import { knowledgeSelectionSchema } from "../../api/ChatbotKnowledgeSchemas";
import type { KnowledgeSelection } from "../../domain/ChatbotKnowledge";
import {
  useChatbotKnowledgeSources,
  usePrepareChatbotKnowledge,
} from "./useChatbotKnowledge";

function SourceChoices({
  kind,
  name,
  label,
  disabled,
}: {
  kind: "funding-call" | "faq";
  name: "fundingCallIds" | "faqIds";
  label: string;
  disabled: boolean;
}) {
  const query = useChatbotKnowledgeSources(kind);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <div className="space-y-2">
      <Controller<KnowledgeSelection, "fundingCallIds" | "faqIds">
        name={name}
        render={({ field, fieldState }) => (
          <FormField
            label={label}
            htmlFor={name}
            error={fieldState.error?.message}
            errorId={`${name}-error`}
          >
            <FormMultiSelect
              id={name}
              name={field.name}
              items={items.map((item) => ({
                value: item.id,
                label: `${item.label} — ${item.revision}`,
              }))}
              value={field.value}
              onChange={field.onChange}
              onBlur={() => field.onBlur()}
              disabled={disabled || query.isPending || query.isError}
              invalid={Boolean(fieldState.error)}
              describedBy={`${name}-error`}
            />
          </FormField>
        )}
      />
      {query.isError ? (
        <GeneralButton variant="outline" onClick={() => void query.refetch()}>
          Retry loading {label.toLowerCase()}
        </GeneralButton>
      ) : null}
      {query.hasNextPage ? (
        <GeneralButton
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Load more {label.toLowerCase()}
        </GeneralButton>
      ) : null}
    </div>
  );
}

export function KnowledgeSourceSelection({
  onPrepared,
  disabled = false,
}: {
  onPrepared: (id: string) => void;
  disabled?: boolean;
}) {
  const form = useForm<KnowledgeSelection>({
    resolver: zodResolver(knowledgeSelectionSchema),
    defaultValues: { fundingCallIds: [], faqIds: [] },
  });
  const mutation = usePrepareChatbotKnowledge();
  const submit = form.handleSubmit(async (selection) => {
    const release = await mutation.mutateAsync(selection).catch(() => null);
    if (release) onPrepared(release.id);
  });
  return (
    <FormProvider {...form}>
      <form
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"
        onSubmit={submit}
      >
        <h2 className="text-lg font-semibold">Select published sources</h2>
        <p className="text-sm text-slate-600">
          Eligibility guidance follows each selected call’s published version.
          FAQs apply globally.
        </p>
        <SourceChoices
          kind="funding-call"
          name="fundingCallIds"
          label="Funding calls"
          disabled={disabled || mutation.isPending}
        />
        <SourceChoices
          kind="faq"
          name="faqIds"
          label="Approved FAQs"
          disabled={disabled || mutation.isPending}
        />
        <GeneralButton type="submit" disabled={disabled || mutation.isPending}>
          {mutation.isPending
            ? "Preparing readable preview…"
            : "Prepare knowledge preview"}
        </GeneralButton>
      </form>
    </FormProvider>
  );
}
