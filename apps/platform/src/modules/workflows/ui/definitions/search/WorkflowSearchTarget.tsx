"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  searchTargetKey,
  type WorkflowSearchMatch,
  type WorkflowSearchTab,
} from "../../../domain/definitions/WorkflowSearch";

import type { FormSearchContent } from "@/modules/forms/domain/FormSearchContent";

export const WorkflowSearchContext = createContext<{
  selected: WorkflowSearchMatch | null;
  stageKey?: string;
  forms?: FormSearchContent[];
}>({ selected: null });
export function WorkflowSearchHighlight({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (!query || index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-yellow-200 text-slate-950">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}
export function WorkflowSearchTarget({
  tab,
  itemKey,
  taskKey,
  children,
}: {
  tab: WorkflowSearchTab;
  itemKey: string;
  taskKey?: string;
  children: ReactNode;
}) {
  const { selected, stageKey } = useContext(WorkflowSearchContext);
  const ref = useRef<HTMLDivElement>(null);
  const active =
    selected?.stageKey === stageKey &&
    selected != null &&
    searchTargetKey(tab, itemKey, taskKey) ===
      searchTargetKey(selected.tab, selected.itemKey, selected.taskKey);
  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      ref.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [active, selected]);
  return (
    <div
      ref={ref}
      tabIndex={active ? -1 : undefined}
      className={
        active ? "rounded bg-yellow-50 p-2 ring-2 ring-amber-400" : undefined
      }
    >
      {active && typeof children === "string" ? (
        <WorkflowSearchHighlight text={children} query={selected.query} />
      ) : (
        children
      )}
      {active && selected.matchText !== children && (
        <p className="mt-1 whitespace-normal text-sm font-normal">
          <WorkflowSearchHighlight
            text={selected.matchText}
            query={selected.query}
          />
        </p>
      )}
    </div>
  );
}
