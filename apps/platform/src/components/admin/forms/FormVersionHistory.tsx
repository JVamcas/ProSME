"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import type { FormVersionSummary } from "@/modules/forms/FormTypes";

export function FormVersionHistory({ versions }: { versions: FormVersionSummary[] }) {
  return (
    <section className="rounded-2xl border border-brand-navy/10 bg-white p-5">
      <h2 className="font-bold text-brand-navy">Version history</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {versions.map((version) => (
          <li
            className="flex justify-between border-b border-brand-navy/10 py-2"
            key={version.id}
          >
            <span>Version {version.versionNumber}</span>
            <StatusBadge status={version.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
