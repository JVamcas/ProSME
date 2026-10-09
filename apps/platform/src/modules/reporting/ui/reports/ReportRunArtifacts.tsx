import { ChevronRight, Download, FileText } from "lucide-react";
import { useId } from "react";
import { IconButton } from "@/components/ui/button";
import type { ReportArtifact } from "../../domain/Report";

export function ReportRunArtifacts({
  artifacts,
  canDownload,
  downloading,
  onDownload,
}: {
  artifacts: ReportArtifact[];
  canDownload: boolean;
  downloading: boolean;
  onDownload: (artifact: ReportArtifact) => void;
}) {
  const headingId = useId();
  if (!artifacts.length) return null;

  const errorFiles = artifacts.every((artifact) => artifact.kind === "ERROR");
  const heading = errorFiles ? "Error file" : "Files";

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h3 id={headingId} className="text-base font-semibold text-brand-navy">
        {heading}
      </h3>
      {artifacts.map((artifact) => (
        <div key={artifact.id} className="space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-brand-navy/10 p-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-brand-navy">
              <FileText aria-hidden="true" className="size-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p
                title={artifact.filename}
                className="truncate text-sm font-medium text-brand-navy"
              >
                {artifact.filename}
              </p>
              <p className="text-xs text-brand-navy/60">
                {artifact.kind === "ERROR"
                  ? "TXT"
                  : artifact.filename.split(".").pop()?.toUpperCase()}
                {" · "}
                {artifact.bytes.toLocaleString()} bytes
              </p>
            </div>
            {canDownload ? (
              <IconButton
                label={`Download ${artifact.filename}`}
                title={`Download ${artifact.filename}`}
                variant="outline"
                className="rounded-lg [&_svg]:text-brand-navy"
                disabled={downloading}
                onClick={() => onDownload(artifact)}
              >
                <Download aria-hidden="true" className="size-4" />
              </IconButton>
            ) : null}
          </div>
          <details className="group text-xs text-brand-navy/65">
            <summary
              tabIndex={0}
              className="flex cursor-pointer list-none items-center gap-2 rounded-md px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange [&::-webkit-details-marker]:hidden"
            >
              <ChevronRight
                aria-hidden="true"
                className="size-4 transition-transform group-open:rotate-90"
              />
              File integrity (SHA-256)
            </summary>
            <p className="break-all rounded-lg bg-slate-50 p-3">
              <span className="sr-only">SHA-256 </span>
              {artifact.checksum}
            </p>
          </details>
        </div>
      ))}
    </section>
  );
}
