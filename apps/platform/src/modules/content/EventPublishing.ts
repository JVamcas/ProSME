import type { CollectionBeforeValidateHook } from "payload";
import { prepareContentSlug } from "./ContentSlug";
import {
  validateEventRecordingUrl,
  validateEventTimezone,
} from "./domain/EventMetadata";

export const prepareEvent: CollectionBeforeValidateHook = async (args) => {
  const data = await prepareContentSlug(args);
  if (!data) return data;
  const timezone =
    data.timezone ?? args.originalDoc?.timezone ?? "Africa/Windhoek";
  const timezoneValidation = validateEventTimezone(timezone);
  if (timezoneValidation !== true) throw new Error(timezoneValidation);
  const recording = data.recordingUrl ?? args.originalDoc?.recordingUrl;
  const recordingValidation = validateEventRecordingUrl(recording);
  if (recordingValidation !== true) throw new Error(recordingValidation);
  const start = data.startsAt ?? args.originalDoc?.startsAt;
  const end =
    data.endsAt === undefined ? args.originalDoc?.endsAt : data.endsAt;
  if (start && end && Date.parse(end) <= Date.parse(start)) {
    throw new Error("End time must be after the start time.");
  }
  return data;
};
