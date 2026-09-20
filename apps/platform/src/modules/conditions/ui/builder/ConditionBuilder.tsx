"use client";

import { useMemo } from "react";
import {
  QueryBuilder,
  type Field,
  type FullOperator,
  type ValidationMap,
} from "react-querybuilder";

import type { ConditionGroup } from "../../domain/ConditionGroup";
import type {
  ConditionFieldDefinition,
  ConditionOperatorDefinition,
} from "../../domain/ConditionConfiguration";
import { formatConditionGroupPreview } from "../../engine/ConditionPreview";
import { validateConditionGroup } from "../../engine/ConditionValidation";
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
import { conditionBuilderOperators } from "../../engine/ConditionOperatorCatalogue";
import { ConditionValidationPreview } from "./ConditionValidationPreview";

function inputType(field: ConditionFieldDefinition) {
  if (field.type === "NUMBER") return "number";
  if (field.type === "DATE") return "date";
  return "text";
}

function queryBuilderFields(fields: readonly ConditionFieldDefinition[]): Field[] {
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
  operators: readonly ConditionOperatorDefinition[],
): FullOperator[] {
  return operators.map((item) => ({
    arity: item.valueShape === "NONE" ? "unary" : undefined,
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
  fields: readonly ConditionFieldDefinition[];
  onChange: (value: ConditionGroup) => void;
  operators?: readonly ConditionOperatorDefinition[];
  value: ConditionGroup;
}) {
  const query = useMemo(() => conditionGroupToQuery(value), [value]);
  const builderFields = useMemo(() => queryBuilderFields(fields), [fields]);
  const builderOperators = useMemo(
    () => queryBuilderOperators(operators),
    [operators],
  );
  const validation = useMemo(
    () => validateConditionGroup(value, fields, operators),
    [fields, operators, value],
  );
  const validationMap = useMemo<ValidationMap>(() => {
    const result: ValidationMap = {};
    for (const issue of validation.issues) {
      const current = result[issue.nodeId];
      const reasons = typeof current === "object" && current.reasons
        ? current.reasons
        : [];
      result[issue.nodeId] = {
        reasons: [...reasons, issue.message],
        valid: false,
      };
    }
    return result;
  }, [validation]);
  const preview = useMemo(
    () => formatConditionGroupPreview(value, fields, operators),
    [fields, operators, value],
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
        validator={() => validationMap}
      />
      <ConditionValidationPreview
        preview={preview}
        validation={validation}
      />
    </div>
  );
}
