import type { ReportDataset } from "../../domain/ReportDataset";
import type { ReportParameterDefinition } from "../../domain/ReportParameters";

export type ReportSqlCompletion = {
  label: string;
  insertText: string;
  detail: string;
  kind: "relation" | "column" | "parameter";
};

export function reportSqlCompletions(
  dataset: ReportDataset,
  parameters: readonly ReportParameterDefinition[],
  aliases: ReadonlyMap<string, string> = new Map(),
): ReportSqlCompletion[] {
  const completions: ReportSqlCompletion[] = [];
  for (const relation of dataset.definition.relations) {
    completions.push({
      label: relation.name,
      insertText: relation.name,
      detail: relation.grain,
      kind: "relation",
    });
    const qualifiers = [
      relation.name,
      ...[...aliases].filter(([, name]) => name === relation.name).map(([alias]) => alias),
    ];
    for (const column of relation.columns) {
      for (const qualifier of qualifiers) {
        const label = `${qualifier}.${column.name}`;
        completions.push({
          label,
          insertText: label,
          detail: `${column.type}${column.nullable ? " nullable" : ""}`,
          kind: "column",
        });
      }
    }
  }
  for (const parameter of parameters) {
    completions.push({
      label: `$${parameter.position}`,
      insertText: `$${parameter.position}`,
      detail: `${parameter.name}: ${parameter.type}`,
      kind: "parameter",
    });
  }
  return completions;
}
