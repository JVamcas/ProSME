const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeEntity(entity: string) {
  let codePoint: number | undefined;
  if (entity.startsWith("#x")) {
    codePoint = Number.parseInt(entity.slice(2), 16);
  } else if (entity.startsWith("#")) {
    codePoint = Number.parseInt(entity.slice(1), 10);
  }
  if (codePoint !== undefined) {
    return Number.isInteger(codePoint) && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : `&${entity};`;
  }
  return namedEntities[entity] ?? `&${entity};`;
}

export function richTextToPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (_, entity: string) =>
      decodeEntity(entity.toLowerCase()),
    )
    .replace(/\s+/g, " ")
    .trim();
}
