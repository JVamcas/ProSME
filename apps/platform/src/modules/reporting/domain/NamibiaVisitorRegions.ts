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

/** GA uses the " Region" suffix for Namibia's administrative regions. */
export function canonicalNamibiaRegion(value: string) {
  const normalized = value.trim().replace(/\s+region$/i, "").toLowerCase();
  return (
    namibiaVisitorRegions.find(
      (region) => region.toLowerCase() === normalized,
    ) ?? null
  );
}
