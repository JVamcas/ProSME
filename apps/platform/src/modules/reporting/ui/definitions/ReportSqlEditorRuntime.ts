"use client";

import type { editor, Environment } from "monaco-editor";
import type { ReportDataset } from "../../domain/ReportDataset";
import type { ReportParameterDefinition } from "../../domain/ReportParameters";
import { reportSqlCompletions } from "./ReportSqlCompletions";

const models = new WeakMap<
  editor.IReadOnlyModel,
  {
    dataset: ReportDataset;
    parameters: readonly ReportParameterDefinition[];
  }
>();
let initialization: ReturnType<typeof initialize> | undefined;
const editorGlobal = globalThis as typeof globalThis & {
  MonacoEnvironment?: Environment;
};

async function initialize() {
  const monaco = await import("monaco-editor/esm/vs/editor/editor.api");
  await import("monaco-sql-languages/esm/languages/pgsql/pgsql.contribution.js");
  const { setupLanguageFeatures, LanguageIdEnum } = await import("monaco-sql-languages");
  const previous = editorGlobal.MonacoEnvironment;
  editorGlobal.MonacoEnvironment = {
    ...previous,
    getWorker: (workerId, label) => {
      if (label === LanguageIdEnum.PG) {
        return new Worker(new URL("./ReportSqlWorker.ts", import.meta.url), { type: "module" });
      }
      if (previous?.getWorker) {
        return previous.getWorker(workerId, label);
      }
      return new Worker(new URL("./ReportEditorWorker.ts", import.meta.url), { type: "module" });
    },
  };
  setupLanguageFeatures(LanguageIdEnum.PG, {
    diagnostics: true,
    completionItems: {
      enable: true,
      triggerCharacters: [" ", ".", "$"],
      completionService: async (model, _position, _context, suggestions, entities) => {
        const selected = models.get(model);
        if (!selected) {
          return [];
        }
        const aliases = new Map<string, string>();
        for (const entity of entities ?? []) {
          const alias = entity._alias?.text;
          if (alias) {
            aliases.set(alias, entity.text);
          }
        }
        const kinds = {
          relation: monaco.languages.CompletionItemKind.Struct,
          column: monaco.languages.CompletionItemKind.Field,
          parameter: monaco.languages.CompletionItemKind.Variable,
        };
        return [
          ...reportSqlCompletions(selected.dataset, selected.parameters, aliases).map((item) => ({
            ...item,
            kind: kinds[item.kind],
          })),
          ...(suggestions?.keywords ?? []).map((keyword) => ({
            label: keyword,
            insertText: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
          })),
        ];
      },
    },
  });
  return { monaco, language: LanguageIdEnum.PG };
}

export async function createReportSqlEditor(input: {
  element: HTMLElement;
  value: string;
  dataset: ReportDataset;
  parameters: readonly ReportParameterDefinition[];
  onChange: (value: string) => void;
}) {
  const { monaco, language } = await (initialization ??= initialize());
  const model = monaco.editor.createModel(input.value, language);
  models.set(model, input);
  const instance = monaco.editor.create(input.element, {
    model,
    automaticLayout: true,
    minimap: { enabled: false },
    ariaLabel: "Report SQL",
    tabSize: 2,
    scrollBeyondLastLine: false,
  });
  const subscription = model.onDidChangeContent(() => input.onChange(model.getValue()));
  return {
    setValue(value: string) {
      if (model.getValue() !== value) {
        model.setValue(value);
      }
    },
    setDataset(dataset: ReportDataset, parameters: readonly ReportParameterDefinition[]) {
      models.set(model, { dataset, parameters });
    },
    dispose() {
      subscription.dispose();
      instance.dispose();
      model.dispose();
      models.delete(model);
    },
  };
}
