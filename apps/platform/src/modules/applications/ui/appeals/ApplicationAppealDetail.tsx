"use client";

import { CircleCheck } from "lucide-react";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import { ArrowLink } from "@/shared/ui/Links";
import { Badge } from "@/shared/ui/Badge";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";
import { useCapabilities } from "@/shared/ui/portal/capability-context";
import { permissionCodes } from "@/auth/authorization/permissions";
import { useApplicationAppeal } from "./useApplicationAppeals";
import {
  AppealAssignmentForm,
  AppealResolutionForm,
} from "./ApplicationAppealManagement";

const stateLabels = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

function AppealTextSection({
  title,
  html,
}: {
  title: string;
  html: string;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-brand-navy/10 bg-white p-5"
    >
      <h4 className="text-base font-bold text-brand-navy">{title}</h4>
      <SanitizedRichTextContent
        className="mt-2 min-w-0 [overflow-wrap:anywhere]"
        sanitizedHtml={html}
      />
    </section>
  );
}

export function ApplicationAppealDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const query = useApplicationAppeal(id);
  const grants = useCapabilities();
  const canAssign = grants.has(permissionCodes.applicationAppealAssignAll);
  const canResolve = grants.has(permissionCodes.applicationAppealResolveAll);

  return (
    <RightDrawer
      open
      onClose={onClose}
      size="xl"
      title={query.data?.reference ?? "Application appeal"}
      description={query.data ? "Application appeal" : undefined}
      headerActions={
        query.data ? (
          <Badge
            variant="outline"
            className={
              query.data.state === "RESOLVED"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-blue-100 bg-blue-50 text-brand-navy"
            }
          >
            {stateLabels[query.data.state]}
          </Badge>
        ) : undefined
      }
    >
      <QuerySection
        query={query}
        loading={<Skeleton className="h-64" />}
        title="application appeal"
      >
        {(appeal) => (
          <div className="space-y-6">
            <section
              aria-label="Application reference"
              className="rounded-xl border border-brand-navy/10 bg-slate-50 p-5"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy/65">
                Application reference
              </h3>
              <p className="mt-2 text-base font-bold text-brand-navy [overflow-wrap:anywhere]">
                {appeal.applicationReference}
              </p>
              <ArrowLink
                className="mt-3"
                href={`/admin/applications/${appeal.applicationId}`}
              >
                View application
              </ArrowLink>
            </section>
            <section aria-label="Appeal submission" className="space-y-4">
              <h3 className="text-lg font-bold text-brand-navy">
                Appeal submission
              </h3>
              <AppealTextSection title="Appeal grounds" html={appeal.grounds} />
              <AppealTextSection title="Appeal details" html={appeal.details} />
            </section>
            {appeal.resolutionNote ? (
              <section
                aria-label="Resolution"
                className="flex items-start gap-4 rounded-xl border border-green-200 bg-green-50/70 p-5"
              >
                <CircleCheck
                  aria-hidden="true"
                  className="mt-0.5 size-7 shrink-0 text-green-700"
                />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-brand-navy">
                    Resolution
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap leading-7 text-brand-navy/75 [overflow-wrap:anywhere]">
                    {appeal.resolutionNote}
                  </p>
                </div>
              </section>
            ) : null}
            {appeal.state !== "RESOLVED" && (canAssign || canResolve) ? (
              <section
                className="space-y-6 rounded-xl border border-brand-navy/10 p-5"
                aria-label="Appeal management"
              >
                <h3 className="text-lg font-bold text-brand-navy">
                  Appeal management
                </h3>
                {canAssign ? (
                  <AppealAssignmentForm
                    key={`assign-${appeal.rowVersion}`}
                    appeal={appeal}
                  />
                ) : null}
                {canResolve ? (
                  <AppealResolutionForm
                    key={`resolve-${appeal.rowVersion}`}
                    appeal={appeal}
                  />
                ) : null}
              </section>
            ) : null}
          </div>
        )}
      </QuerySection>
    </RightDrawer>
  );
}
