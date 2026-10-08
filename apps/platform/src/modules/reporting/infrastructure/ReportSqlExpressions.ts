import { ReportQueryValidationError } from "../domain/ReportQueryLimits";
import {
  array,
  builtinName,
  names,
  object,
  onlyKeys,
  resolveColumn,
  type SqlScope,
} from "./ReportSqlAst";

export type ExpressionPolicy = {
  functions: readonly string[];
  parameters: Set<number>;
  parameterCount: number;
  select: (node: unknown, scope: SqlScope) => string[];
};

const operators = new Set([
  "=",
  "<>",
  "!=",
  "<",
  ">",
  "<=",
  ">=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "||",
  "~~",
  "!~~",
  "~~*",
  "!~~*",
]);
const types = new Set([
  "text",
  "uuid",
  "date",
  "timestamp",
  "timestamptz",
  "interval",
  "numeric",
  "int2",
  "int4",
  "int8",
  "integer",
  "bigint",
  "bool",
  "boolean",
]);

function operator(value: unknown) {
  const path = names(value);
  const name =
    path.length === 1 ? path[0] : path[0] === "pg_catalog" && path.length === 2 ? path[1] : "";
  if (!operators.has(name)) {
    throw new ReportQueryValidationError("SQL operator is not permitted.");
  }
}

export function validateExpression(
  value: unknown,
  scope: SqlScope,
  policy: ExpressionPolicy,
): void {
  if (value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child) => validateExpression(child, scope, policy));
    return;
  }
  const entry = object(value);
  if (Object.keys(entry).length !== 1) {
    throw new ReportQueryValidationError("Unsupported SQL expression.");
  }
  const [kind, contents] = Object.entries(entry)[0];
  const node = object(contents);
  const visit = (child: unknown) => validateExpression(child, scope, policy);
  switch (kind) {
    case "ColumnRef":
      onlyKeys(node, ["fields", "location"]);
      resolveColumn(node.fields, scope);
      return;
    case "ParamRef": {
      onlyKeys(node, ["number", "location"]);
      const position = node.number;
      if (
        !Number.isInteger(position) ||
        Number(position) < 1 ||
        Number(position) > policy.parameterCount
      ) {
        throw new ReportQueryValidationError("SQL references an undeclared positional parameter.");
      }
      policy.parameters.add(Number(position));
      return;
    }
    case "A_Const":
      onlyKeys(node, ["ival", "fval", "sval", "boolval", "isnull", "location"]);
      return;
    case "FuncCall": {
      onlyKeys(node, [
        "funcname",
        "args",
        "agg_order",
        "agg_filter",
        "agg_star",
        "agg_distinct",
        "funcformat",
        "location",
      ]);
      const name = builtinName(node.funcname);
      if (!policy.functions.includes(name) || (node.agg_star && name !== "count")) {
        throw new ReportQueryValidationError("SQL function is not permitted by this dataset.");
      }
      visit(node.args);
      visit(node.agg_order);
      visit(node.agg_filter);
      return;
    }
    case "TypeCast": {
      onlyKeys(node, ["arg", "typeName", "location"]);
      const type = object(node.typeName);
      onlyKeys(type, ["names", "typmods", "typemod", "arrayBounds", "location"]);
      if (!types.has(builtinName(type.names))) {
        throw new ReportQueryValidationError("SQL cast type is not permitted.");
      }
      visit(node.arg);
      visit(type.typmods);
      for (const bound of array(type.arrayBounds)) {
        if (object(object(bound).Integer).ival !== -1) {
          throw new ReportQueryValidationError("Only ordinary parameter arrays are supported.");
        }
      }
      return;
    }
    case "A_Expr":
      onlyKeys(node, ["kind", "name", "lexpr", "rexpr", "location"]);
      if (
        ![
          "AEXPR_OP",
          "AEXPR_OP_ANY",
          "AEXPR_OP_ALL",
          "AEXPR_IN",
          "AEXPR_LIKE",
          "AEXPR_ILIKE",
          "AEXPR_BETWEEN",
          "AEXPR_NOT_BETWEEN",
          "AEXPR_DISTINCT",
          "AEXPR_NOT_DISTINCT",
          "AEXPR_NULLIF",
        ].includes(String(node.kind))
      ) {
        throw new ReportQueryValidationError("SQL expression operator is not supported.");
      }
      operator(node.name);
      visit(node.lexpr);
      visit(node.rexpr);
      return;
    case "BoolExpr":
      onlyKeys(node, ["boolop", "args", "location"]);
      visit(node.args);
      return;
    case "NullTest":
    case "BooleanTest":
      onlyKeys(node, ["arg", "nulltesttype", "argisrow", "booltesttype", "location"]);
      visit(node.arg);
      return;
    case "CoalesceExpr":
    case "MinMaxExpr":
    case "A_ArrayExpr":
      onlyKeys(node, ["args", "elements", "op", "location"]);
      visit(node.args ?? node.elements);
      return;
    case "CaseExpr":
      onlyKeys(node, ["arg", "args", "defresult", "location"]);
      visit(node.arg);
      visit(node.args);
      visit(node.defresult);
      return;
    case "CaseWhen":
      onlyKeys(node, ["expr", "result", "location"]);
      visit(node.expr);
      visit(node.result);
      return;
    case "SortBy":
      onlyKeys(node, ["node", "sortby_dir", "sortby_nulls", "location"]);
      visit(node.node);
      return;
    case "SubLink":
      onlyKeys(node, ["subLinkType", "subselect", "testexpr", "operName", "location"]);
      if (
        !["EXISTS_SUBLINK", "EXPR_SUBLINK", "ANY_SUBLINK", "ALL_SUBLINK"].includes(
          String(node.subLinkType),
        )
      ) {
        throw new ReportQueryValidationError("Unsupported nested query.");
      }
      if (array(node.operName).length) {
        operator(node.operName);
      }
      visit(node.testexpr);
      policy.select(node.subselect, scope);
      return;
    default:
      throw new ReportQueryValidationError(`Unsupported SQL expression: ${kind}.`);
  }
}
