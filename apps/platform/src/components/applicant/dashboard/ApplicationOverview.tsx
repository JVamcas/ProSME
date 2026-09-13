import { Check } from "lucide-react";

import type { ApplicationValues } from "@/data/application-schema";

const timeline = [
  { title: "Submitted", text: "Application received", done: true },
  { title: "Completeness check", text: "Currently in progress", active: true },
  { title: "Technical assessment", text: "Pending" },
  { title: "Finance review", text: "Pending" },
  { title: "Decision", text: "Pending" },
];

type Props = {
  application: Partial<ApplicationValues>;
  documentCount: number;
  reference: string;
  submittedAt: string | null;
};

export function ApplicationOverview(props: Props) {
  return (
    <>
      <ApplicationMetrics documentCount={props.documentCount} />
      <section className="card mt-6 overflow-hidden">
        <ApplicationHeader {...props} />
        <div className="p-6">
          <h3 className="text-sm font-bold text-navy">Application progress</h3>
          <div className="mt-6 grid gap-0 md:grid-cols-5">
            {timeline.map((item, index) => <TimelineStep key={item.title} item={item} index={index} />)}
          </div>
        </div>
      </section>
    </>
  );
}

function ApplicationMetrics({ documentCount }: { documentCount: number }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      <Metric label="Active applications" value="1" />
      <Metric label="Current stage" value="Completeness check" compact />
      <Metric label="Documents provided" value={`${documentCount} / 8`} />
    </div>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 font-bold ${compact ? "text-amber-700" : "text-3xl text-navy"}`}>{value}</p>
    </div>
  );
}

function ApplicationHeader({ application, reference, submittedAt }: Props) {
  const submitted = submittedAt
    ? new Intl.DateTimeFormat("en-NA", { dateStyle: "medium" }).format(new Date(submittedAt))
    : "today";
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-orange">{reference}</p>
        <h2 className="mt-2 text-lg font-bold text-navy">{application.businessName}</h2>
        <p className="mt-1 text-xs text-slate-500">Submitted {submitted} · N${Number(application.amountRequested ?? 0).toLocaleString("en-NA")}</p>
      </div>
      <span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">In completeness check</span>
    </div>
  );
}

function TimelineStep({ item, index }: { item: (typeof timeline)[number]; index: number }) {
  const tone = item.done ? "border-emerald-600 bg-emerald-600 text-white" : item.active ? "border-orange bg-white text-navy" : "border-slate-200 bg-white text-slate-300";
  return (
    <div className="relative flex gap-4 pb-6 md:block md:pb-0">
      <div className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 ${tone}`}>
        {item.done ? <Check className="size-4" /> : <span className="size-2 rounded-full bg-current" />}
      </div>
      {index < timeline.length - 1 ? <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 md:left-8 md:top-[15px] md:h-0.5 md:w-[calc(100%-2rem)] ${item.done ? "bg-emerald-400" : "bg-slate-200"}`} /> : null}
      <div className="md:mt-3 md:pr-3">
        <p className="text-xs font-bold text-slate-800">{item.title}</p>
        <p className="mt-1 text-[11px] text-slate-400">{item.text}</p>
      </div>
    </div>
  );
}
