import { defaultHomeProcess } from "./ContentDefaults";
import type { HomepageContent } from "./ContentTypes";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function cards(value: unknown, titleKey: "title" | "label") {
  if (!Array.isArray(value)) return [];
  return value.map((item: unknown) => {
    const row = record(item);
    return {
      id: typeof row.id === "string" ? row.id : undefined,
      title: text(row[titleKey]),
      description: text(row.description),
    };
  });
}

export function homeProcessContent(value: unknown): HomepageContent["process"] {
  const process = record(value);
  return {
    heading: text(process.heading, defaultHomeProcess.heading),
    introduction: text(process.introduction, defaultHomeProcess.introduction),
    steps: cards(process.steps, "title"),
  };
}

export function homeSupportContent(
  value: unknown,
): Pick<
  HomepageContent,
  "supportHeading" | "supportIntroduction" | "supportCards"
> {
  const home = record(value);
  return {
    supportHeading: text(home.supportHeading, "Who we support"),
    supportIntroduction: text(home.supportIntroduction),
    supportCards: cards(home.supportCards, "label").map(
      ({ id, title, description }) => ({
        id,
        label: title,
        description,
      }),
    ),
  };
}
