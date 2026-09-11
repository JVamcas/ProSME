import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const roots = ["apps/platform/src", "apps/platform/tests", "scripts"];
const sourceExtensions = new Set([".js", ".mjs", ".ts", ".tsx"]);

function isExempt(file) {
  return file.endsWith("payload-types.ts")
    || file.includes("/migrations/")
    || file.endsWith("/importMap.js");
}

function limitFor(file) {
  const name = path.basename(file);
  if (["page.tsx", "layout.tsx", "route.ts"].includes(name)) return 150;
  if (file.includes("/tests/") || name.endsWith(".test.ts") || name.endsWith(".test.tsx")) return 300;
  if (file.includes("/components/") || file.includes("/hooks/")) return 200;
  if (/\.(repository|service|policy|integration)\.ts$/.test(name)) return 250;
  return 200;
}

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collect(target) : [target];
  }));
  return nested.flat();
}

const files = (await Promise.all(roots.map((root) => collect(path.join(repositoryRoot, root)))))
  .flat()
  .filter((file) => sourceExtensions.has(path.extname(file)) && !isExempt(file));

const failures = [];
for (const file of files) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/).length;
  const limit = limitFor(file);
  if (lines > limit) failures.push(`${path.relative(repositoryRoot, file)}: ${lines}/${limit}`);
}

if (failures.length) {
  console.error(`File-size limits exceeded:\n${failures.join("\n")}`);
  process.exit(1);
}

console.info(`File-size check passed for ${files.length} handwritten files.`);
