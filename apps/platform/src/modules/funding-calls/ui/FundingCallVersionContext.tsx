import type { FundingCallView } from "../api/FundingCallTransport";

export function FundingCallVersionContext({
  call,
  editable = false,
}: {
  call: FundingCallView;
  editable?: boolean;
}) {
  const current = call.currentPublishedVersionNumber;
  const source = call.sourcePublishedVersionNumber;
  let opened: string;
  if (call.viewedPublishedVersionId) {
    opened = `Viewing: Version ${call.viewedPublishedVersionNumber ?? "unavailable"} · Read-only`;
  } else if (call.draftVersionId) {
    opened = `${editable ? "Editing" : "Viewing"}: Replacement draft · Based on version ${source ?? "unavailable"}`;
  } else if (call.currentPublishedVersionId) {
    opened = `Viewing: Version ${current ?? "unavailable"}`;
  } else {
    opened = `${editable ? "Editing" : "Viewing"}: Initial unpublished version`;
  }

  return (
    <span className="inline-flex flex-wrap gap-x-5 gap-y-1">
      <span>{opened}</span>
      <span>
        {call.currentPublishedVersionId
          ? `Current published: Version ${current ?? "unavailable"}`
          : "No published version"}
      </span>
    </span>
  );
}
