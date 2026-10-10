import { describe, expect, it } from "vitest";
import { lexicalToKnowledgeText } from "@/modules/content/domain/LexicalPlainText";

describe("readable public FAQ conversion", () => {
  it("converts paragraphs, numbered lists and public links without editor metadata", () => {
    const answer = lexicalToKnowledgeText({
      root: {
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", text: "First paragraph." }],
          },
          {
            type: "list",
            listType: "number",
            children: [
              {
                type: "listitem",
                children: [{ type: "text", text: "Step one" }],
              },
              {
                type: "listitem",
                children: [
                  {
                    type: "link",
                    fields: { url: "/how-to-apply" },
                    children: [{ type: "text", text: "Apply" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(answer.issues).toEqual([]);
    expect(answer.text).toBe(
      "First paragraph.\n\n1. Step one\n2. Apply (/how-to-apply)",
    );
    expect(
      lexicalToKnowledgeText({
        root: { type: "root", children: [{ type: "upload" }] },
      }).issues,
    ).not.toEqual([]);
    expect(
      lexicalToKnowledgeText({
        root: { type: "link", fields: { url: "javascript:alert(1)" } },
      }).issues,
    ).not.toEqual([]);
  });

  it("preserves nested list hierarchy and blocks unknown list semantics", () => {
    const root = {
      type: "root",
      children: [
        {
          type: "list",
          listType: "bullet",
          children: [
            {
              type: "listitem",
              children: [
                { type: "text", text: "Required documents" },
                {
                  type: "list",
                  listType: "number",
                  children: [
                    {
                      type: "listitem",
                      children: [
                        { type: "text", text: "Registration certificate" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(lexicalToKnowledgeText({ root }).text).toBe(
      "- Required documents\n  1. Registration certificate",
    );
    root.children[0].listType = "unknown-checklist";
    expect(lexicalToKnowledgeText({ root }).issues[0]).toMatch(
      /unsupported list style/,
    );
  });
});
