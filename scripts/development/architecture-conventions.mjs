import path from "node:path";

export function isBackendService(specifier) {
  return (
    (specifier.endsWith(".service") && !specifier.endsWith("-client.service"))
    || /(?:^|\/)Server[A-Z][A-Za-z0-9]*Service$/.test(specifier)
  );
}

export function isClientService(file) {
  const name = path.basename(file);
  return file.endsWith("-client.service.ts")
    || /^Client[A-Z][A-Za-z0-9]*Service\.ts$/.test(name);
}

export function isHook(file) {
  const name = path.basename(file);
  return name.endsWith(".hooks.ts")
    || name.endsWith("Hooks.ts")
    || name.startsWith("use-")
    || (/^use[A-Z]/.test(name) && name.endsWith(".ts"));
}

export function isRepositorySpecifier(specifier) {
  return specifier.includes(".repository")
    || /(?:^|\/)[A-Z][A-Za-z0-9]*Repository$/.test(specifier);
}
