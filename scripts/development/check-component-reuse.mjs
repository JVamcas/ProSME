import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import ts from "typescript";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const sourcePrefix = "apps/platform/src/";
const nativeControls = {
  button: { component: "GeneralButton", owner: "shared/ui/Button.tsx" },
  input: {
    component: "Input / Checkbox",
    owner: "shared/ui/FormPrimitives.tsx",
  },
  select: {
    component: "Select / FormMultiSelect",
    owner: "shared/ui/FormPrimitives.tsx",
  },
  textarea: { component: "Textarea", owner: "shared/ui/FormPrimitives.tsx" },
  label: { component: "Label", owner: "shared/ui/FormPrimitives.tsx" },
  table: { component: "DataTable", owner: "shared/ui/DataTable.tsx" },
  dialog: {
    component: "DraggableDialog / ConfirmationDialog",
    owner: "shared/ui/DraggableDialog.tsx",
  },
};
// Established composite controls own their internal HTML. Feature files never
// become exemptions just because they copy a shared primitive's implementation.
const compositeOwners = new Set([
  "shared/ui/FormMultiSelect.tsx",
  "shared/ui/FormRadioGroup.tsx",
  "shared/ui/FormDateInput.tsx",
  "shared/ui/FormDateTimeInput.tsx",
  "shared/ui/FormDateCalendarActions.tsx",
  "shared/ui/ConfirmationDialog.tsx",
]);

function declarations(parsed) {
  const names = [];
  for (const statement of parsed.statements) {
    if (
      !statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    )
      continue;
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      /^[A-Z]/.test(statement.name.text)
    ) {
      names.push(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          /^[A-Z]/.test(declaration.name.text)
        )
          names.push(declaration.name.text);
      }
    }
  }
  return names;
}

export function componentReuseViolations(sources, changedPaths) {
  const parsed = new Map(
    [...sources].map(([file, source]) => [
      file,
      ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      ),
    ]),
  );
  const catalogue = new Map();
  for (const [file, tree] of parsed) {
    for (const name of declarations(tree)) {
      catalogue.set(name, [...(catalogue.get(name) ?? []), file]);
    }
  }
  const failures = [];
  for (const file of changedPaths) {
    const tree = parsed.get(file);
    if (!tree || file.startsWith("payload/") || file.includes("(payload)/"))
      continue;
    function checkNative(tag) {
      const rule = nativeControls[tag];
      if (rule && file !== rule.owner && !compositeOwners.has(file)) {
        failures.push(
          `${file}: use existing ${rule.component} instead of hardwiring <${tag}>`,
        );
      }
    }
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        checkNative(node.tagName.getText(tree));
        const dialogRole = node.attributes.properties.some(
          (property) =>
            ts.isJsxAttribute(property) &&
            property.name.getText(tree) === "role" &&
            property.initializer &&
            ts.isStringLiteral(property.initializer) &&
            property.initializer.text === "dialog",
        );
        if (
          dialogRole &&
          ![
            "shared/ui/DraggableDialog.tsx",
            "shared/ui/RightDrawer.tsx",
            "shared/ui/ConfirmationDialog.tsx",
          ].includes(file)
        ) {
          failures.push(
            `${file}: use existing DraggableDialog / RightDrawer instead of hardwiring a dialog role`,
          );
        }
      }
      if (
        ts.isCallExpression(node) &&
        /^(React\.)?createElement$/.test(node.expression.getText(tree)) &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        checkNative(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
    for (const name of declarations(tree)) {
      const existing =
        catalogue.get(name)?.filter((other) => other !== file) ?? [];
      if (existing.length)
        failures.push(
          `${file}: exported component ${name} already exists in ${existing.join(", ")}; reuse it or clarify its distinct responsibility`,
        );
    }
  }
  return [...new Set(failures)];
}

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? collect(file) : [file];
      }),
    )
  ).flat();
}

async function main() {
  const run = promisify(execFile);
  const base = process.env.COMPONENT_REUSE_BASE;
  if (base && !/^[a-f0-9]{40}$/.test(base)) {
    throw new Error("COMPONENT_REUSE_BASE must be a full commit SHA.");
  }
  const results = await Promise.all([
    run("git", ["diff", "--name-only", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }),
    run("git", ["ls-files", "--others", "--exclude-standard"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }),
    ...(base && !/^0+$/.test(base)
      ? [
          run("git", ["diff", "--name-only", base, "HEAD", "--"], {
            cwd: repositoryRoot,
            encoding: "utf8",
          }),
        ]
      : []),
  ]);
  const changed = [
    ...results.flatMap((result) => result.stdout.trim().split("\n")),
  ].filter((file) => file.startsWith(sourcePrefix) && file.endsWith(".tsx"));
  const files = (await collect(path.join(repositoryRoot, sourcePrefix))).filter(
    (file) => file.endsWith(".tsx"),
  );
  const sources = new Map(
    await Promise.all(
      files.map(async (file) => [
        path.relative(path.join(repositoryRoot, sourcePrefix), file),
        await readFile(file, "utf8"),
      ]),
    ),
  );
  const checkedPaths = new Set([
    ...changed.map((file) => file.slice(sourcePrefix.length)),
    ...[...sources.keys()].filter((file) =>
      file.startsWith("modules/chatbot/"),
    ),
  ]);
  const failures = componentReuseViolations(sources, checkedPaths);
  if (failures.length) {
    console.error(`Component reuse violations:\n${failures.join("\n")}`);
    process.exitCode = 1;
    return;
  }
  console.info(
    `Component reuse check passed for ${checkedPaths.size} new, changed or chatbot React files.`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
