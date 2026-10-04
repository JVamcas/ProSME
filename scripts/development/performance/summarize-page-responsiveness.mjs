import { readFile, writeFile } from "node:fs/promises";

const [comparisonFile, originalFile, outputFile] = process.argv.slice(2);
if (!comparisonFile || !originalFile || !outputFile) {
  throw new Error(
    "Provide comparison JSON, original G0 JSON and summary output.",
  );
}
const comparison = JSON.parse(await readFile(comparisonFile, "utf8"));
const original = JSON.parse(await readFile(originalFile, "utf8"));
const routes = [...new Set(comparison.measurements.map((row) => row.route))];
const results = [];

function median(values) {
  if (!values.length || values.some((value) => !Number.isFinite(value)))
    return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function metrics(rows) {
  return Object.fromEntries(
    ["feedbackMs", "structureMs", "dataMs"].map((key) => [
      key,
      median(rows.map((row) => row[key])),
    ]),
  );
}

function withinTolerance(current, reference, condition) {
  const absolute = condition === "cold" ? 250 : 100;
  return (
    current !== null &&
    reference !== null &&
    (current <= reference * 1.2 || current - reference <= absolute)
  );
}

for (const route of routes) {
  const converted =
    route === "/admin" ||
    route === "/portal" ||
    /^\/(admin|portal)\/applications\/[^/]+$/.test(route);
  for (const condition of comparison.conditions) {
    const select = (rows, variant) =>
      rows.filter(
        (row) =>
          row.route === route &&
          row.condition === condition &&
          (!variant || row.variant === variant),
      );
    const currentRows = select(comparison.measurements, "current");
    const referenceRows = select(comparison.measurements, "reference");
    const originalRows = select(original.measurements);
    const current = metrics(currentRows);
    const reference = metrics(referenceRows);
    const g0 = metrics(originalRows);
    const result = {
      route,
      condition,
      converted,
      samples: {
        current: currentRows.length,
        reference: referenceRows.length,
        g0: originalRows.length,
      },
      current,
      reference,
      g0,
      complete:
        currentRows.length === comparison.samples &&
        referenceRows.length === comparison.samples &&
        originalRows.length > 0,
      fullDataToleranceMet:
        withinTolerance(current.dataMs, reference.dataMs, condition) &&
        withinTolerance(current.dataMs, g0.dataMs, condition),
    };
    if (converted && condition === "delayed") {
      result.structureLeadMs = median(
        currentRows.map((row) => row.dataMs - row.structureMs),
      );
      result.structureImprovementPercent =
        100 * (1 - current.structureMs / reference.structureMs);
      result.g0StructureImprovementPercent =
        100 * (1 - current.structureMs / g0.structureMs);
      result.structureTargetsMet =
        current.feedbackMs !== null &&
        current.feedbackMs <= 150 &&
        current.structureMs !== null &&
        current.structureMs <= 250 &&
        result.structureImprovementPercent >= 80 &&
        result.g0StructureImprovementPercent >= 80 &&
        result.structureLeadMs !== null &&
        result.structureLeadMs >= 1000;
    }
    results.push(result);
  }
}
const allTargetsMet = results.every(
  (row) =>
    row.complete &&
    row.fullDataToleranceMet &&
    row.structureTargetsMet !== false,
);
await writeFile(
  outputFile,
  `${JSON.stringify(
    {
      comparison: "Paired current/reference observations",
      historicalBaseline: "Original G0 recorded observations",
      allTargetsMet,
      results,
    },
    null,
    2,
  )}\n`,
);
console.log(
  JSON.stringify({
    observations: comparison.measurements.length,
    allTargetsMet,
  }),
);
if (!allTargetsMet) process.exitCode = 1;
