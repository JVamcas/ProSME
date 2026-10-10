type Node = {
  type?: string;
  text?: string;
  children?: Node[];
  fields?: { url?: string; linkType?: string };
  url?: string;
  listType?: string;
  start?: number;
};

export function publicKnowledgeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^\/(?!\/)[^\\]*$/.test(value)) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? value
      : null;
  } catch {
    return null;
  }
}

// Unknown editor nodes block export rather than silently dropping meaningful content.
export function lexicalToKnowledgeText(value: unknown) {
  const issues: string[] = [];
  let count = 0;
  function render(node: Node, depth = 0): string {
    if (++count > 5000 || depth > 30)
      throw new Error("FAQ editor content exceeds conversion limits.");
    const children = () =>
      (node.children ?? []).map((child) => render(child, depth + 1)).join("");
    switch (node.type) {
      case "text":
        return node.text ?? "";
      case "linebreak":
        return "\n";
      case "root":
        return children().replace(/\n{3,}/g, "\n\n").trim();
      case "paragraph":
      case "heading":
      case "quote":
        return `${children()}\n\n`;
      case "list": {
        if (node.listType && !["bullet", "number"].includes(node.listType)) {
          issues.push(
            "An unsupported list style requires a public text correction.",
          );
        }
        return (
          "\n" +
          (node.children ?? [])
            .map((child, index) => {
              const prefix =
                node.listType === "number"
                  ? `${(node.start ?? 1) + index}. `
                  : "- ";
              const lines = render(child, depth + 1)
                .trim()
                .split("\n");
              const item = lines
                .map((line, lineIndex) =>
                  lineIndex === 0 ? `${prefix}${line}` : `  ${line}`,
                )
                .join("\n");
              return `${item}\n`;
            })
            .join("") +
          "\n"
        );
      }
      case "listitem":
        return children();
      case "link":
      case "autolink": {
        const url = publicKnowledgeUrl(node.fields?.url ?? node.url);
        if (!url) issues.push("A link has no safe public URL.");
        return url ? `${children()} (${url})` : children();
      }
      default:
        issues.push(
          "An unsupported editor element requires a public text correction.",
        );
        return "";
    }
  }
  if (!value || typeof value !== "object" || !("root" in value)) {
    return { text: "", issues: ["FAQ answer has no readable editor content."] };
  }
  try {
    return { text: render((value as { root: Node }).root), issues };
  } catch {
    return {
      text: "",
      issues: ["FAQ editor content exceeds conversion limits."],
    };
  }
}
