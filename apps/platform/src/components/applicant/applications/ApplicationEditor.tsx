"use client";

import { toast } from "sonner";

import { PortalErrorState } from "@/components/layout/portal-error-state";
import { PortalLoadingState } from "@/components/layout/portal-loading-state";
import {
  useOwnApplication,
  useUpdateApplication,
} from "@/modules/applications/ApplicationHooks";
import type { ApplicationUpdateInput } from "@/modules/applications/ApplicationSchemas";
import {
  ApplicationWorkspace,
  type SaveApplication,
} from "./ApplicationWorkspace";

export function ApplicationEditor({
  applicationId,
}: {
  applicationId: string;
}) {
  const application = useOwnApplication(applicationId);
  const mutation = useUpdateApplication(applicationId);

  if (application.isPending) {
    return (
      <PortalLoadingState
        title="Loading application"
        description="Your latest saved changes are being prepared."
      />
    );
  }
  if (application.isError || !application.data) {
    return (
      <PortalErrorState
        title="Application could not be loaded"
        description={
          application.error?.message ?? "This application is unavailable."
        }
        onAction={() => void application.refetch()}
      />
    );
  }

  const save: SaveApplication = async (input: ApplicationUpdateInput) => {
    const updated = await mutation.mutateAsync(input);
    toast.success(
      input.intent === "continue"
        ? "Section completed and saved"
        : "Application saved",
    );
    return updated;
  };
  const reload = () => {
    mutation.reset();
    void application.refetch();
  };

  return (
    <ApplicationWorkspace
      application={application.data}
      error={mutation.error}
      onReload={reload}
      pending={mutation.isPending}
      save={save}
    />
  );
}
