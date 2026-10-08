"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportDataset } from "../../domain/ReportDataset";
import type { ReportParameterDefinition } from "../../domain/ReportParameters";
import type { createReportSqlEditor } from "./ReportSqlEditorRuntime";

type SqlEditor = Awaited<ReturnType<typeof createReportSqlEditor>>;

// The parent React Hook Form Controller owns the value. No field state lives here.
export function ReportSqlEditor({
  value,
  onChange,
  dataset,
  parameters,
}: {
  value: string;
  onChange: (value: string) => void;
  dataset: ReportDataset;
  parameters: readonly ReportParameterDefinition[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const editor = useRef<SqlEditor | null>(null);
  const current = useRef({ value, onChange, dataset, parameters });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    current.current = { value, onChange, dataset, parameters };
    editor.current?.setValue(value);
    editor.current?.setDataset(dataset, parameters);
  }, [value, onChange, dataset, parameters]);

  useEffect(() => {
    let cancelled = false;
    const element = container.current;
    if (!element) {
      return;
    }
    void import("./ReportSqlEditorRuntime")
      .then(({ createReportSqlEditor }) =>
        createReportSqlEditor({
          ...current.current,
          element,
          onChange: (next) => current.current.onChange(next),
        }),
      )
      .then((instance) => {
        if (cancelled) {
          instance.dispose();
        } else {
          editor.current = instance;
          instance.setValue(current.current.value);
          instance.setDataset(current.current.dataset, current.current.parameters);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("The SQL editor could not be loaded.");
        }
      });
    return () => {
      cancelled = true;
      editor.current?.dispose();
      editor.current = null;
    };
  }, []);

  return (
    <div>
      <div ref={container} className="h-80 rounded border" />
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
