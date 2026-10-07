export const namibiaVisitorRegions = [
  "Erongo",
  "Hardap",
  "//Karas",
  "Kavango East",
  "Kavango West",
  "Khomas",
  "Kunene",
  "Ohangwena",
  "Omaheke",
  "Omusati",
  "Oshana",
  "Oshikoto",
  "Otjozondjupa",
  "Zambezi",
] as const;

/** Exact canonical names only until provider aliases have been verified live. */
export function canonicalNamibiaRegion(value: string) {
  return (
    namibiaVisitorRegions.find(
      (region) => region.toLowerCase() === value.toLowerCase(),
    ) ?? null
  );
}
