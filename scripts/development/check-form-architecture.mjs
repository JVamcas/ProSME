import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

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

export function checkUseForm(file, source, failures) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const formHookNames = new Set(["useForm"]);

  for (const statement of parsed.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;

    for (const binding of bindings.elements) {
      const importedName = binding.propertyName?.text ?? binding.name.text;
      if (importedName !== "useForm") continue;
      if (statement.moduleSpecifier.text === "@payloadcms/ui") {
        // Payload owns its form state; this hook does not create an RHF form.
        formHookNames.delete(binding.name.text);
      } else if (statement.moduleSpecifier.text === "react-hook-form") {
        formHookNames.add(binding.name.text);
      }
    }
  }

  let createsForm = false;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
        formHookNames.has(node.expression.text)) {
      createsForm = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  if (createsForm && !source.includes("zodResolver")) {
    addFailure(
      failures,
      file,
      "React Hook Form instances must use a Zod resolver",
    );
  }
}

async function main() {
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
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  await main();
}
