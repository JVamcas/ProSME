import type { FundingCallView } from "../api/FundingCallTransport";
import type { FundingCall } from "../domain/FundingCall";

export function toFundingCallView(call: FundingCall): FundingCallView {
  const { thumbnailObjectKey, ...visibleCall } = call;
  const thumbnailVersion = call.viewedPublishedVersionId
    ? `&versionId=${call.viewedPublishedVersionId}`
    : "";
  return {
    ...visibleCall,
    attachmentsLockedAt: call.attachmentsLockedAt?.toISOString() ?? null,
    closesAt: call.closesAt.toISOString(),
    createdAt: call.createdAt.toISOString(),
    opensAt: call.opensAt.toISOString(),
    thumbnailUrl: thumbnailObjectKey
      ? `/api/admin/funding-calls/${call.id}/thumbnail?v=${call.updatedAt.getTime()}${thumbnailVersion}`
      : null,
    updatedAt: call.updatedAt.toISOString(),
  };
}
