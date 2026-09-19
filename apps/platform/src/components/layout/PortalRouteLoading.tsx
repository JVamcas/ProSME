import { PortalLoadingState } from "./PortalLoadingState";

export function PortalRouteLoading() {
  return (
    <PortalLoadingState
      title="Loading your workspace"
      description="Please wait while the latest information is prepared."
    />
  );
}
