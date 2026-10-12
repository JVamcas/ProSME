import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getEventOperationsOverview } from "@/modules/content/application/ServerEventOperationsService";
import { EventOperationsWorkspace } from "@/modules/content/ui/operations/EventOperationsWorkspace";

export default async function OperationsEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const overview = await getEventOperationsOverview(
    await getAuthenticatedPageUser(),
    eventId,
  );
  return <EventOperationsWorkspace initial={overview} />;
}
