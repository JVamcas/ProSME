"use client";

import { useMemo } from "react";
import {
  QueryBuilder,
  type Field,
  type FullOperator,
} from "react-querybuilder";

import type { ConditionGroup } from "../../domain/ConditionGroup";
import {
  conditionGroupToQuery,
  queryToConditionGroup,
} from "./ConditionBuilderAdapter";
import {
  ConditionActionButton,
  ConditionValueInput,
  ConditionValueSelector,
} from "./ConditionBuilderControls";
import styles from "./ConditionBuilder.module.css";
import { conditionBuilderOperators } from "./ConditionBuilderOperators";
import type {
  ConditionBuilderField,
  ConditionBuilderOperator,
} from "./ConditionBuilderTypes";

function inputType(field: ConditionBuilderField) {
  if (field.type === "NUMBER") return "number";
  if (field.type === "DATE") return "date";
  return "text";
}

function queryBuilderFields(fields: readonly ConditionBuilderField[]): Field[] {
  return fields.map((field) => ({
    conditionType: field.type,
    inputType: inputType(field),
    label: field.label,
    name: field.key,
    valueEditorType: field.type === "BOOLEAN" ? "select" : "text",
    values: field.type === "BOOLEAN"
      ? [
          { label: "True", name: "true" },
          { label: "False", name: "false" },
        ]
      : undefined,
  }));
}

function queryBuilderOperators(
  operators: readonly ConditionBuilderOperator[],
): FullOperator[] {
  return operators.map((item) => ({
    arity: item.valueEditor === "NONE" ? "unary" : undefined,
    label: item.label,
    name: item.code,
    value: item.code,
  }));
}

export function ConditionBuilder({
  createId = () => crypto.randomUUID(),
  disabled = false,
  fields,
  onChange,
  operators = conditionBuilderOperators,
  value,
}: {
  createId?: () => string;
  disabled?: boolean;
  fields: readonly ConditionBuilderField[];
  onChange: (value: ConditionGroup) => void;
  operators?: readonly ConditionBuilderOperator[];
  value: ConditionGroup;
}) {
  const query = useMemo(() => conditionGroupToQuery(value), [value]);
  const builderFields = useMemo(() => queryBuilderFields(fields), [fields]);
  const builderOperators = useMemo(
    () => queryBuilderOperators(operators),
    [operators],
  );

  return (
    <div className={styles.builder}>
      <QueryBuilder
        addRuleToNewGroups={false}
        combinators={[
          { label: "All (AND)", name: "AND" },
          { label: "Any (OR)", name: "OR" },
        ]}
        controlElements={{
          actionElement: ConditionActionButton,
          valueEditor: ConditionValueInput,
          valueSelector: ConditionValueSelector,
        }}
        disabled={disabled}
        fields={builderFields}
        idGenerator={createId}
        listsAsArrays
        onQueryChange={(nextQuery) => {
          const nextValue = queryToConditionGroup(
            nextQuery,
            operators,
            createId,
          );
          if (JSON.stringify(nextValue) !== JSON.stringify(value)) {
            onChange(nextValue);
          }
        }}
        operators={builderOperators}
        parseNumbers="strict-limited"
        query={query}
        resetOnFieldChange
        resetOnOperatorChange
        translations={{
          addGroup: { label: "+ Group", title: "Add group" },
          addRule: { label: "+ Condition", title: "Add condition" },
          combinators: { title: "Group match" },
          fields: { title: "Field" },
          operators: { title: "Operator" },
          removeGroup: { label: "Remove group", title: "Remove group" },
          removeRule: {
            label: "Remove condition",
            title: "Remove condition",
          },
          value: { title: "Value" },
        }}
      />
    </div>
  );
}
