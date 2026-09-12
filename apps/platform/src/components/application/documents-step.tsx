import { Check, Paperclip } from "lucide-react";

import { Input } from "@/components/ui/form-controls";
import { applicationDocuments } from "@/data/application-form";

type DocumentsStepProps = {
  documents: Record<string, string>;
  onSelect: (key: string, name: string) => void;
};

export function DocumentsStep({
  documents,
  onSelect,
}: DocumentsStepProps) {
  return (
    <div>
      <div className="rounded-2xl border border-orange/30 bg-orange-pale p-5 text-sm leading-6 text-slate-600">
        <strong className="text-navy">Demo upload:</strong> Files are
        represented by name and remain on this device. No document is sent to a
        server.
      </div>
      <div className="mt-6 grid gap-3">
        {applicationDocuments.map(([key, label]) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-orange"
          >
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                documents[key]
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {documents[key] ? (
                <Check className="size-5" />
              ) : (
                <Paperclip className="size-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm text-navy">{label}</strong>
              <span className="block truncate text-xs text-slate-400">
                {documents[key] || "Choose PDF file"}
              </span>
            </span>
            <Input
              className="sr-only"
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onSelect(key, file.name);
                }
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
