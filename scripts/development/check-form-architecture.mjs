import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const sourceRoot = path.join(repositoryRoot, "apps/platform/src");
const sourceExtensions = new Set([".ts", ".tsx"]);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? collect(target) : [target];
    }),
  );

  return children.flat();
}

function addFailure(failures, file, message) {
  const relativeFile = path
    .relative(sourceRoot, file)
    .replaceAll(path.sep, "/");
  failures.push(`${relativeFile}: ${message}`);
}

function checkFormComponent(file, source, failures) {
  const isPayloadFile = file.includes(`${path.sep}(payload)${path.sep}`);
  if (!source.includes("<form") || isPayloadFile) {
    return;
  }

  if (!source.includes("FormProvider") || !source.includes(".handleSubmit(")) {
    addFailure(
      failures,
      file,
      "handwritten forms must submit through React Hook Form",
    );
  }

  if (source.includes("new FormData(")) {
    addFailure(
      failures,
      file,
      "handwritten forms must not manually parse FormData",
    );
  }
}

function checkUseForm(file, source, failures) {
  const createsForm = /\buseForm(?:<|\()/.test(source);
  if (createsForm && !source.includes("zodResolver")) {
    addFailure(
      failures,
      file,
      "React Hook Form instances must use a Zod resolver",
    );
  }
}

const files = (await collect(sourceRoot)).filter((file) =>
  sourceExtensions.has(path.extname(file)),
);
const failures = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  checkFormComponent(file, source, failures);
  checkUseForm(file, source, failures);
}

if (failures.length > 0) {
  console.error(`Form architecture violations:\n${failures.join("\n")}`);
  process.exit(1);
}

console.info(`Form architecture check passed for ${files.length} source files.`);
