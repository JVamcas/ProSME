import { Suspense } from "react";
import { WebsiteAnalyticsConsent } from "./WebsiteAnalyticsConsent";
import { getWebsiteAnalyticsMeasurementId } from "../ServerWebsiteAnalyticsCollectionService";

export function WebsiteAnalyticsCollection() {
  return (
    <Suspense fallback={null}>
      <WebsiteAnalyticsConsent
        measurementId={getWebsiteAnalyticsMeasurementId()}
      />
    </Suspense>
  );
}
