import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const sourceRoot = path.join(repositoryRoot, "apps/platform/src");
const sourceExtensions = new Set([".ts", ".tsx"]);
const transportOnlyRoutes = new Set([
  "app/api/auth/logout/route.ts",
  "app/api/health/route.ts",
  "app/api/preview/exit/route.ts",
]);

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

function importsFrom(source) {
  const imports = [];
  const pattern = /(?:from\s+|import\s*)["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    imports.push(match[1]);
  }
  return imports;
}

function isBackendService(specifier) {
  return specifier.endsWith(".service")
    && !specifier.endsWith("-client.service");
}

function isClientService(file) {
  return file.endsWith("-client.service.ts");
}

function isHook(file) {
  const name = path.basename(file);
  return name.endsWith(".hooks.ts") || name.startsWith("use-");
}

function hasServerImport(imports) {
  return imports.some((specifier) =>
    specifier.startsWith("@/db")
      || specifier.includes(".repository")
      || specifier.startsWith("@/payload")
      || specifier === "@payload-config"
      || specifier === "firebase-admin"
      || specifier === "server-only"
      || isBackendService(specifier),
  );
}

function addFailure(failures, relativeFile, message) {
  failures.push(`${relativeFile}: ${message}`);
}

function checkClientBoundary(context) {
  const { failures, file, imports, relativeFile, source } = context;
  if (isClientService(file) && !source.startsWith('"use client"')) {
    addFailure(failures, relativeFile, "frontend client services must declare the client boundary");
  }

  if (!source.startsWith('"use client"')) {
    return;
  }

  if (!isClientService(file) && /\bfetch\s*\(/.test(source)) {
    addFailure(failures, relativeFile, "client code must call a client service instead of fetch");
  }

  if (hasServerImport(imports)) {
    addFailure(failures, relativeFile, "client code imports a server-side layer");
  }

  const ownsFirebaseBrowserAccess =
    relativeFile === "auth/firebase/client.ts"
      || relativeFile.endsWith("auth-client.service.ts");
  if (imports.includes("firebase/auth") && !ownsFirebaseBrowserAccess) {
    addFailure(failures, relativeFile, "Firebase browser calls belong in auth-client.service.ts");
  }
}

function checkUiDataAccess(context) {
  const { failures, imports, relativeFile } = context;
  const isPage = /\/(?:page|layout)\.tsx$/.test(`/${relativeFile}`);
  const isComponent = relativeFile.startsWith("components/");
  if (!isPage && !isComponent) {
    return;
  }

  const importsDataLayer = imports.some((specifier) =>
    specifier.startsWith("@/db") || specifier.includes(".repository"),
  );
  if (importsDataLayer) {
    addFailure(failures, relativeFile, "UI files must not import repositories or database code");
  }
}

function checkHook(context) {
  const { failures, file, imports, relativeFile, source } = context;
  if (!isHook(file)) {
    return;
  }

  if (!source.startsWith('"use client"')) {
    addFailure(failures, relativeFile, "React hooks must declare the client boundary");
  }

  if (/\bfetch\s*\(/.test(source) || hasServerImport(imports)) {
    addFailure(failures, relativeFile, "hooks must use frontend client services");
  }
}

function checkRoute(context) {
  const { failures, imports, relativeFile } = context;
  if (!relativeFile.endsWith("route.ts") || relativeFile.includes("app/(payload)/")) {
    return;
  }

  const directDataImport = imports.some((specifier) =>
    specifier.startsWith("@/db") || specifier.includes(".repository"),
  );
  if (directDataImport && relativeFile !== "app/api/health/route.ts") {
    addFailure(failures, relativeFile, "route handlers must not import repositories or database code");
  }

  const isExplicitApi = relativeFile.startsWith("app/api/");
  const hasService = imports.some(isBackendService);
  if (isExplicitApi && !transportOnlyRoutes.has(relativeFile) && !hasService) {
    addFailure(failures, relativeFile, "API route must delegate to a backend service");
  }
}

function checkBackendService(context) {
  const { failures, file, imports, relativeFile, source } = context;
  if (!file.endsWith(".service.ts") || isClientService(file)) {
    return;
  }

  if (!source.includes('import "server-only"')) {
    addFailure(failures, relativeFile, "backend services must be server-only");
  }

  const directDatabaseImport = imports.some((specifier) =>
    specifier === "@/db/client" || specifier.startsWith("@/db/schema"),
  );
  if (directDatabaseImport) {
    addFailure(failures, relativeFile, "backend services must use repositories for database access");
  }
}

function checkRepository(context) {
  const { failures, file, relativeFile, source } = context;
  if (!file.endsWith(".repository.ts")) {
    return;
  }

  if (!source.includes('import "server-only"')) {
    addFailure(failures, relativeFile, "repositories must be server-only");
  }
}

const files = (await collect(sourceRoot)).filter((file) =>
  sourceExtensions.has(path.extname(file)),
);
const failures = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const context = {
    failures,
    file,
    imports: importsFrom(source),
    relativeFile: path.relative(sourceRoot, file).replaceAll(path.sep, "/"),
    source,
  };
  checkClientBoundary(context);
  checkUiDataAccess(context);
  checkHook(context);
  checkRoute(context);
  checkBackendService(context);
  checkRepository(context);
}

if (failures.length > 0) {
  console.error(`Architecture boundary violations:\n${failures.join("\n")}`);
  process.exit(1);
}

console.info(`Architecture boundary check passed for ${files.length} source files.`);
