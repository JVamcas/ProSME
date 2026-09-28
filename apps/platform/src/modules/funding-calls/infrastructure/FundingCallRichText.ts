import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "blockquote",
  "br",
  "em",
  "h2",
  "h3",
  "hr",
  "li",
  "ol",
  "p",
  "s",
  "strong",
  "ul",
];

export function sanitizeFundingCallRichText(value: string) {
  return sanitizeHtml(value, {
    allowedAttributes: {},
    allowedTags,
    disallowedTagsMode: "discard",
  });
}

export const sanitizeFundingCallDescription = sanitizeFundingCallRichText;

export function sanitizeFundingCallEligibilitySummary(value: string | null) {
  return value === null ? null : sanitizeFundingCallRichText(value);
}
