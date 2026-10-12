export const eventTypeOptions = [
  { label: "Information session", value: "information-session" },
  { label: "Workshop", value: "workshop" },
  { label: "Roadshow", value: "roadshow" },
  { label: "Stakeholder forum", value: "stakeholder-forum" },
  { label: "Webinar", value: "webinar" },
  { label: "Virtual session", value: "virtual-session" },
];

export function validateEventTimezone(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "Enter a timezone.";
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return "Enter a valid IANA timezone, such as Africa/Windhoek.";
  }
}

export function validateEventRecordingUrl(value: unknown) {
  if (!value) return true;
  if (typeof value !== "string") return "Enter a recording URL.";
  try {
    const url = new URL(value);
    if (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    ) {
      return true;
    }
  } catch {
    // Return the same readable validation for malformed or unsafe links.
  }
  return "Enter an HTTP or HTTPS recording URL without credentials.";
}
