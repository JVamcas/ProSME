import type { FormSearchContent } from "@/modules/forms/domain/FormSearchContent";
import type { WorkflowGraphInput } from "./WorkflowTypes";
import { taskUsesFormSections } from "./WorkflowTaskFormWork";

export type WorkflowSearchTab =
  | "tasks"
  | "forms"
  | "checklists"
  | "documents"
  | "scoring"
  | "comments"
  | "actions";
export type WorkflowSearchEntry = {
  stageKey: string;
  tab: WorkflowSearchTab;
  taskKey?: string;
  itemKey: string;
  label: string;
  path: string;
  texts: string[];
};
export type WorkflowSearchMatch = WorkflowSearchEntry & {
  matchText: string;
  query: string;
};
export function searchTargetKey(tab: string, itemKey: string, taskKey = "") {
  return JSON.stringify([tab, taskKey, itemKey]);
}

export function workflowSearchEntries(
  graph: WorkflowGraphInput,
  forms: FormSearchContent[],
): WorkflowSearchEntry[] {
  const entries: WorkflowSearchEntry[] = [];
  const formsByVersion = new Map(forms.map((form) => [form.versionId, form]));
  for (const stage of graph.stages) {
    const add = (
      tab: WorkflowSearchTab,
      itemKey: string,
      label: string,
      texts: string[],
      taskKey?: string,
      section?: string,
    ) => {
      const task = stage.tasks.find((item) => item.stableKey === taskKey);
      entries.push({
        stageKey: stage.stableKey,
        tab,
        taskKey,
        itemKey,
        label,
        path: [stage.name, task?.name, section, tab]
          .filter(Boolean)
          .join(" › "),
        texts: [label, itemKey, ...texts].filter(Boolean),
      });
    };
    add("tasks", "$stage", stage.name, [stage.stableKey, stage.description]);
    for (const task of stage.tasks) {
      add(
        "tasks",
        task.stableKey,
        task.name,
        [task.description],
        task.stableKey,
      );
      const form = formsByVersion.get(task.formBinding?.formVersionId ?? "");
      if (!form) continue;
      add("forms", "$form", form.name, [form.description], task.stableKey);
      for (const section of form.sections) {
        add(
          "forms",
          section.id,
          section.title,
          [section.description],
          task.stableKey,
        );
        for (const field of section.fields) {
          add(
            "forms",
            field.key,
            field.label,
            [field.helpText, ...field.options, ...(field.details ?? [])],
            task.stableKey,
            section.title,
          );
        }
      }
    }
    for (const item of stage.checklistItems)
      add("checklists", item.key, item.text, [item.notes], item.taskStableKey);
    for (const item of stage.documentRequirements) {
      if (
        stage.tasks.some(
          (task) =>
            task.stableKey === item.taskStableKey &&
            taskUsesFormSections(task.config),
        )
      )
        continue;
      add(
        "documents",
        item.stableKey,
        item.name,
        [item.templateReference],
        item.taskStableKey,
      );
    }
    for (const scoring of stage.scoring ?? []) {
      for (const item of scoring.criteria)
        add(
          "scoring",
          item.stableKey,
          item.criterion,
          [item.description],
          scoring.taskStableKey,
        );
    }
    for (const item of stage.commentFields ?? [])
      add(
        "comments",
        item.key,
        item.label,
        [item.helpText],
        item.taskStableKey,
      );
    for (const item of stage.actions)
      add("actions", item.stableKey, item.label, []);
  }
  return entries;
}

export function findWorkflowMatches(
  entries: WorkflowSearchEntry[],
  text: string,
): WorkflowSearchMatch[] {
  const query = text.trim();
  if (!query) return [];
  const normalized = query.toLocaleLowerCase();
  return entries.flatMap((entry) => {
    const matchText = entry.texts.find((value) =>
      value.toLocaleLowerCase().includes(normalized),
    );
    return matchText ? [{ ...entry, matchText, query }] : [];
  });
}
