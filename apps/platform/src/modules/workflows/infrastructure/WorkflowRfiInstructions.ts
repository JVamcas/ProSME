import "server-only";

import sanitizeHtml from "sanitize-html";

import { richTextToPlainText } from "@/shared/utils/RichText";

const allowedTags = [
  "blockquote",
  "br",
  "em",
  "h2",
  "h3",
  "li",
  "ol",
  "p",
  "s",
  "strong",
  "ul",
];

export function sanitizeWorkflowRfiInstructions(value: string) {
  return sanitizeHtml(value, {
    allowedAttributes: {},
    allowedTags,
  });
}

export function workflowRfiInstructionsSummary(value: string) {
  return richTextToPlainText(value);
}
