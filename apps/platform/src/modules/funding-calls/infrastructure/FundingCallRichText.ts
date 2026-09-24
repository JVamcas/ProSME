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

export function sanitizeFundingCallDescription(value: string) {
  return sanitizeHtml(value, {
    allowedAttributes: {},
    allowedTags,
    disallowedTagsMode: "discard",
  });
}
