export const fundingCallThumbnailMaximumBytes = 2 * 1024 * 1024;
export const fundingCallThumbnailStoredMaximumBytes = 200 * 1024;
export const fundingCallThumbnailWidths = [320, 640, 1024] as const;

export function fundingCallThumbnailWidth(requestedWidth = 1024) {
  return fundingCallThumbnailWidths.find((width) => width >= requestedWidth)
    ?? fundingCallThumbnailWidths[fundingCallThumbnailWidths.length - 1];
}
