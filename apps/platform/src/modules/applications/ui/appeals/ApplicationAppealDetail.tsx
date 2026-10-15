"use client";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import { ArrowLink } from "@/shared/ui/Links";
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
export function ApplicationAppealDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const query = useApplicationAppeal(id);
  const grants = useCapabilities();
  return (
    <RightDrawer
      open
      onClose={onClose}
      size="xl"
      title={
        query.data ? `Appeal ${query.data.reference}` : "Application appeal"
      }
    >
      <QuerySection
        query={query}
        loading={<Skeleton className="h-64" />}
        title="application appeal"
      >
        {(appeal) => (
          <div className="space-y-6">
            <ArrowLink href={`/admin/applications/${appeal.applicationId}`}>
              View application {appeal.applicationReference}
            </ArrowLink>
            <section aria-label="Submitter">
              <h2 className="font-bold">Submitter</h2>
              <p>{appeal.name}</p>
              <p>{appeal.email}</p>
              <p>{appeal.phone}</p>
            </section>
            <section>
              <h2 className="font-bold">Appeal grounds</h2>
              <SanitizedRichTextContent sanitizedHtml={appeal.grounds} />
            </section>
            <section>
              <h2 className="font-bold">Appeal details</h2>
              <SanitizedRichTextContent sanitizedHtml={appeal.details} />
            </section>
            {appeal.resolutionNote ? (
              <section>
                <h2 className="font-bold">Resolution</h2>
                <p className="whitespace-pre-wrap">{appeal.resolutionNote}</p>
              </section>
            ) : null}
            {appeal.state !== "RESOLVED" ? (
              <section className="space-y-6" aria-label="Appeal management">
                <h2 className="font-bold">Appeal management</h2>
                {grants.has(permissionCodes.applicationAppealAssignAll) ? (
                  <AppealAssignmentForm
                    key={`assign-${appeal.rowVersion}`}
                    appeal={appeal}
                  />
                ) : null}
                {grants.has(permissionCodes.applicationAppealResolveAll) ? (
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
