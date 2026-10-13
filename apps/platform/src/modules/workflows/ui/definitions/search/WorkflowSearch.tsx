"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FormInput } from "@/components/ui/form-fields";
import { GeneralButton } from "@/components/ui/button";
import {
  findWorkflowMatches,
  type WorkflowSearchEntry,
  type WorkflowSearchMatch,
} from "../../../domain/definitions/WorkflowSearch";
import { WorkflowSearchHighlight } from "./WorkflowSearchTarget";
const schema = z.object({ query: z.string().max(200) });

export function WorkflowSearch({
  entries,
  loading,
  error,
  onSelect,
  onClear,
  onRetry,
}: {
  entries: WorkflowSearchEntry[];
  loading: boolean;
  error: boolean;
  onSelect: (match: WorkflowSearchMatch) => void;
  onClear: () => void;
  onRetry: () => void;
}) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { query: "" },
  });
  const query = useWatch({ control: form.control, name: "query" });
  const matches = findWorkflowMatches(entries, query);
  return (
    <FormProvider {...form}>
      <form
        role="search"
        className="my-5 space-y-3"
        onSubmit={form.handleSubmit(() => {
          if (matches[0]) onSelect(matches[0]);
        })}
      >
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FormInput
              name="query"
              label="Find in workflow"
              placeholder="Search stages, tasks, forms, fields, scores…"
              maxLength={200}
            />
          </div>
          <GeneralButton
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              onClear();
            }}
          >
            Clear
          </GeneralButton>
        </div>
        {loading && (
          <p role="status" className="text-sm">
            Loading form sections for search…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm">
            Form text could not be loaded. Workflow items are still searchable.{" "}
            <GeneralButton
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
            >
              Retry
            </GeneralButton>
          </p>
        )}
        {query.trim() && (
          <>
            <p role="status" className="text-sm">
              {matches.length} {matches.length === 1 ? "match" : "matches"}
              {loading ? " so far" : ""}
            </p>
            <ul
              aria-label="Workflow search results"
              className="max-h-64 overflow-y-auto rounded-xl border border-brand-navy/15"
            >
              {matches.map((match) => (
                <li
                  key={JSON.stringify([
                    match.stageKey,
                    match.tab,
                    match.taskKey,
                    match.itemKey,
                  ])}
                >
                  <GeneralButton
                    variant="ghost"
                    type="button"
                    className="block h-auto w-full rounded-none border-b border-brand-navy/10 p-3 text-left hover:bg-brand-cream focus-visible:ring-2 focus-visible:ring-brand-blue"
                    onClick={() => onSelect({ ...match })}
                  >
                    <span className="block text-xs text-brand-navy/65">
                      {match.path}
                    </span>
                    <span className="block font-semibold">{match.label}</span>
                    <span className="block text-sm">
                      <WorkflowSearchHighlight
                        text={match.matchText}
                        query={match.query}
                      />
                    </span>
                  </GeneralButton>
                </li>
              ))}
            </ul>
          </>
        )}
      </form>
    </FormProvider>
  );
}
