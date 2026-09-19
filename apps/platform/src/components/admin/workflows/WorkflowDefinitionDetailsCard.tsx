import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";

type Props = {
  editor: WorkflowEditorView;
};

const detailLabelClass =
  "text-xs font-bold uppercase tracking-[0.14em] text-brand-navy/55";

export function WorkflowDefinitionDetailsCard({ editor }: Props) {
  const details = [
    { label: "Code", value: editor.definition.code },
    { label: "Version", value: `v${editor.version.number}` },
    { label: "Revision", value: editor.version.rowVersion },
  ];

  return (
    <section
      aria-label="Workflow definition details"
      className="mt-6 rounded-2xl border border-brand-navy/10 bg-brand-cream/60 p-4 sm:p-5"
    >
      <div className="rounded-2xl border border-brand-navy/15 bg-brand-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <dl className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className={detailLabelClass}>{detail.label}</dt>
              <dd className="mt-2 break-words text-base font-bold text-brand-navy">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-7 text-sm leading-6 text-brand-navy/65">
          {editor.definition.description ||
            "Workflow definition for funding opportunities."}
        </p>
      </div>
    </section>
  );
}
