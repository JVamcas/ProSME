import { ReportQueryValidationError, reportQueryLimits } from "../domain/ReportQueryLimits";

export type AstObject = Record<string, unknown>;
export type SqlScope = Map<string, readonly string[]>;

export function object(value: unknown): AstObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ReportQueryValidationError("Unsupported SQL structure.");
  }
  return value as AstObject;
}

export function array(value: unknown): unknown[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new ReportQueryValidationError("Unsupported SQL list.");
  }
  return value;
}

export function names(value: unknown): string[] {
  return array(value).map((item) => {
    const name = object(object(item).String).sval;
    if (typeof name !== "string") {
      throw new ReportQueryValidationError("Wildcards and executable identifiers are not allowed.");
    }
    return name;
  });
}

export function onlyKeys(node: AstObject, allowed: readonly string[]) {
  if (Object.keys(node).some((key) => !allowed.includes(key))) {
    throw new ReportQueryValidationError("SQL contains an unsupported clause.");
  }
}

export function builtinName(value: unknown): string {
  const path = names(value);
  if (path.length === 1 || (path.length === 2 && path[0] === "pg_catalog")) {
    return path.at(-1)!;
  }
  throw new ReportQueryValidationError("Only approved PostgreSQL built-ins are allowed.");
}

export function checkAstSize(value: unknown, depth = 0, budget = { nodes: 0 }) {
  if (++budget.nodes > reportQueryLimits.astNodes || depth > reportQueryLimits.astDepth) {
    throw new ReportQueryValidationError("SQL structure exceeds the execution policy limits.");
  }
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) {
      checkAstSize(child, depth + 1, budget);
    }
  }
}

export function resolveColumn(value: unknown, scope: SqlScope): string {
  const path = names(value);
  const column = path.at(-1)!;
  if (path.length === 2 && scope.get(path[0])?.includes(column)) {
    return column;
  }
  if (path.length === 1) {
    const matches = [...scope.values()].filter((columns) => columns.includes(column));
    if (matches.length === 1) {
      return column;
    }
  }
  throw new ReportQueryValidationError("Unknown or ambiguous dataset column.");
}
