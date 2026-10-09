import "server-only";

import { parse } from "libpg-query";
import type { ReportDataset } from "../domain/ReportDataset";
import { ReportQueryValidationError, reportQueryLimits } from "../domain/ReportQueryLimits";
import { array, checkAstSize, names, object, onlyKeys, type SqlScope } from "./ReportSqlAst";
import { validateExpression, type ExpressionPolicy } from "./ReportSqlExpressions";

class DatasetSqlPolicy {
  readonly parameters = new Set<number>();
  private relationCount = 0;

  constructor(
    private dataset: ReportDataset,
    private parameterCount: number,
  ) {}

  private expressionPolicy(ctes: SqlScope): ExpressionPolicy {
    return {
      functions: this.dataset.definition.functions,
      parameters: this.parameters,
      parameterCount: this.parameterCount,
      select: (node, scope) => this.select(node, scope, ctes),
    };
  }

  private addRelation(scope: SqlScope, name: string, columns: readonly string[]) {
    if (scope.has(name)) {
      throw new ReportQueryValidationError("Relation aliases must be unique.");
    }
    scope.set(name, columns);
  }

  private from(value: unknown, scope: SqlScope, ctes: SqlScope, inherited: SqlScope) {
    const entry = object(value);
    if (Object.keys(entry).length !== 1) {
      throw new ReportQueryValidationError("Unsupported SQL source.");
    }
    if (entry.RangeVar) {
      const node = object(entry.RangeVar);
      onlyKeys(node, ["relname", "schemaname", "inh", "relpersistence", "alias", "location"]);
      const relation = this.dataset.definition.relations.find((item) => item.name === node.relname);
      if (node.schemaname && node.schemaname !== "public") {
        throw new ReportQueryValidationError("SQL cannot access another schema.");
      }
      const columns =
        relation?.columns.map((column) => column.name) ??
        (!node.schemaname ? ctes.get(String(node.relname)) : undefined);
      if (!columns) {
        throw new ReportQueryValidationError(
          "SQL relation does not belong to the selected dataset.",
        );
      }
      if (relation) {
        this.relationCount++;
      }
      const alias = node.alias ? object(node.alias) : null;
      if (alias) {
        onlyKeys(alias, ["aliasname"]);
      }
      this.addRelation(scope, String(alias?.aliasname ?? node.relname), columns);
      return;
    }
    if (entry.RangeSubselect) {
      const node = object(entry.RangeSubselect);
      onlyKeys(node, ["subquery", "alias"]);
      const alias = object(node.alias);
      onlyKeys(alias, ["aliasname"]);
      this.addRelation(scope, String(alias.aliasname), this.select(node.subquery, new Map(), ctes));
      return;
    }
    if (entry.JoinExpr) {
      const node = object(entry.JoinExpr);
      onlyKeys(node, ["jointype", "larg", "rarg", "quals"]);
      if (!["JOIN_INNER", "JOIN_LEFT", "JOIN_RIGHT", "JOIN_FULL"].includes(String(node.jointype))) {
        throw new ReportQueryValidationError("Unsupported dataset join.");
      }
      this.from(node.larg, scope, ctes, inherited);
      this.from(node.rarg, scope, ctes, inherited);
      validateExpression(
        node.quals,
        new Map([...inherited, ...scope]),
        this.expressionPolicy(ctes),
      );
      return;
    }
    throw new ReportQueryValidationError(
      "SQL source must be an approved view, CTE or read subquery.",
    );
  }

  select(
    value: unknown,
    inherited: SqlScope = new Map(),
    parentCtes: SqlScope = new Map(),
  ): string[] {
    const entry = object(value);
    onlyKeys(entry, ["SelectStmt"]);
    const node = object(entry.SelectStmt);
    onlyKeys(node, [
      "targetList",
      "fromClause",
      "whereClause",
      "groupClause",
      "havingClause",
      "sortClause",
      "limitCount",
      "limitOffset",
      "limitOption",
      "distinctClause",
      "withClause",
      "op",
      "all",
      "larg",
      "rarg",
    ]);
    const ctes = new Map(parentCtes);
    if (node.withClause) {
      const clause = object(node.withClause);
      onlyKeys(clause, ["ctes", "location"]);
      for (const value of array(clause.ctes)) {
        const cte = object(object(value).CommonTableExpr);
        onlyKeys(cte, ["ctename", "aliascolnames", "ctematerialized", "ctequery", "location"]);
        const name = String(cte.ctename);
        if (
          ctes.has(name) ||
          this.dataset.definition.relations.some((item) => item.name === name)
        ) {
          throw new ReportQueryValidationError("CTE names cannot shadow existing sources.");
        }
        const output = this.select(cte.ctequery, new Map(), ctes);
        const aliases = names(cte.aliascolnames);
        if (aliases.length && aliases.length !== output.length) {
          throw new ReportQueryValidationError("CTE columns must match their projection.");
        }
        ctes.set(name, aliases.length ? aliases : output);
      }
    }
    if (node.op && node.op !== "SETOP_NONE") {
      if (node.op !== "SETOP_UNION") {
        throw new ReportQueryValidationError("Only UNION read set operations are supported.");
      }
      const left = this.select({ SelectStmt: node.larg }, inherited, ctes);
      const right = this.select({ SelectStmt: node.rarg }, inherited, ctes);
      if (left.length !== right.length) {
        throw new ReportQueryValidationError("UNION result projections must align.");
      }
      this.validateTail(node, new Map([["output", left]]), ctes, left);
      return left;
    }
    const local: SqlScope = new Map();
    for (const source of array(node.fromClause)) {
      this.from(source, local, ctes, inherited);
    }
    const scope = new Map([...inherited, ...local]);
    const policy = this.expressionPolicy(ctes);
    const output = array(node.targetList).map((item) => {
      const target = object(object(item).ResTarget);
      onlyKeys(target, ["name", "val", "location"]);
      validateExpression(target.val, scope, policy);
      const expression = object(target.val);
      const name =
        target.name ??
        (expression.ColumnRef ? names(object(expression.ColumnRef).fields).at(-1) : null);
      if (typeof name !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(name)) {
        throw new ReportQueryValidationError(
          "Every calculated output requires an explicit column alias.",
        );
      }
      return name;
    });
    if (!output.length || new Set(output).size !== output.length) {
      throw new ReportQueryValidationError("SQL requires a unique explicit result projection.");
    }
    validateExpression(node.whereClause, scope, policy);
    validateExpression(node.havingClause, scope, policy);
    const groupScope = new Map(scope);
    const sourceColumns = [...scope.values()].flat();
    groupScope.set(
      "output",
      output.filter((column) => !sourceColumns.includes(column)),
    );
    validateExpression(node.groupClause, groupScope, policy);
    if (array(node.distinctClause).some((item) => item !== null)) {
      throw new ReportQueryValidationError(
        "DISTINCT ON is not supported; use approved aggregation.",
      );
    }
    this.validateTail(node, scope, ctes, output);
    return output;
  }

  private validateTail(
    node: Record<string, unknown>,
    scope: SqlScope,
    ctes: SqlScope,
    output: string[],
  ) {
    const policy = this.expressionPolicy(ctes);
    for (const item of array(node.sortClause)) {
      const sort = object(object(item).SortBy);
      onlyKeys(sort, ["node", "sortby_dir", "sortby_nulls", "location"]);
      const expression = object(sort.node);
      const path = expression.ColumnRef ? names(object(expression.ColumnRef).fields) : [];
      if (!(path.length === 1 && output.includes(path[0]))) {
        validateExpression(sort.node, scope, policy);
      }
    }
    validateExpression(node.limitCount, new Map(), policy);
    validateExpression(node.limitOffset, new Map(), policy);
  }

  validate(statement: unknown) {
    const columns = this.select(statement);
    if (!this.relationCount) {
      throw new ReportQueryValidationError("A reporting query must read the selected dataset.");
    }
    if (this.parameters.size !== this.parameterCount) {
      throw new ReportQueryValidationError("Every declared parameter must be used by SQL.");
    }
    return columns;
  }
}

export async function validateReportSql(
  sql: string,
  dataset: ReportDataset,
  parameterCount: number,
) {
  if (
    Buffer.byteLength(sql, "utf8") > reportQueryLimits.sqlBytes ||
    parameterCount > reportQueryLimits.parameters
  ) {
    throw new ReportQueryValidationError(
      "SQL or parameter count exceeds the execution policy limits.",
    );
  }
  let parsed;
  try {
    parsed = await parse(sql);
  } catch {
    throw new ReportQueryValidationError("Invalid PostgreSQL SQL.");
  }
  checkAstSize(parsed);
  if (parsed.stmts.length !== 1) {
    throw new ReportQueryValidationError("Exactly one read query is required.");
  }
  return new DatasetSqlPolicy(dataset, parameterCount).validate(parsed.stmts[0].stmt);
}

// PostgreSQL statement offsets are UTF-8 byte offsets, including non-ASCII literals.
export async function reportStatementText(sql: string) {
  const parsed = await parse(sql);
  const statement = parsed.stmts[0];
  const start = statement.stmt_location ?? 0;
  const end = statement.stmt_len ? start + statement.stmt_len : undefined;
  return Buffer.from(sql, "utf8").subarray(start, end).toString("utf8");
}

// Qualify only parsed dataset RangeVars. Keeping public out of search_path also
// prevents a user-defined operator overload from executing through a safe symbol.
export async function prepareReportStatement(sql: string, dataset: ReportDataset) {
  const parsed = await parse(sql);
  const positions = new Set<number>();
  const relations = new Set(dataset.definition.relations.map((item) => item.name));
  function visit(value: unknown) {
    if (!value || typeof value !== "object") {
      return;
    }
    const entry = value as Record<string, unknown>;
    if (entry.RangeVar) {
      const relation = object(entry.RangeVar);
      if (!relation.schemaname && relations.has(String(relation.relname))) {
        positions.add(Number(relation.location));
      }
    }
    Object.values(entry).forEach(visit);
  }
  visit(parsed);
  let bytes = Buffer.from(sql, "utf8");
  for (const position of [...positions].sort((left, right) => right - left)) {
    bytes = Buffer.concat([
      bytes.subarray(0, position),
      Buffer.from("public."),
      bytes.subarray(position),
    ]);
  }
  return bytes.toString("utf8");
}
