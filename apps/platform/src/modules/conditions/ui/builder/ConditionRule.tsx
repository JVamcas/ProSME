"use client";

import type { RuleProps } from "react-querybuilder";

import { GeneralButton } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-fields";
import type {
  ConditionFieldType,
  ConditionOperatorDefinition,
} from "../../domain/ConditionConfiguration";
import type { JsonValue, Operand } from "../../domain/Operand";
import { useConditionBuilderControls } from "./ConditionBuilderContext";
import {
  CollectionValueEditor,
  OperandEditor,
  operandType,
} from "./ConditionOperandEditors";

type BuilderRuleMeta = {
  leftOperand?: Operand;
};

function compatibleOperators(
  type: ConditionFieldType | undefined,
  operators: readonly ConditionOperatorDefinition[],
) {
  return operators
    .filter((definition) => !type || definition.allowedFieldTypes.includes(type))
    .map((definition) => ({ label: definition.label, value: definition.code }));
}

export function ConditionRule({
  actions,
  disabled,
  path,
  rule,
}: RuleProps) {
  const { fields, operators } = useConditionBuilderControls();
  const meta = (rule.meta ?? {}) as BuilderRuleMeta;
  const leftOperand = meta.leftOperand ?? {
    key: rule.field,
    kind: "FIELD" as const,
  };
  const leftType = operandType(leftOperand, fields) ?? "TEXT";
  const definition = operators.find((item) => item.code === rule.operator);
  const rightOperand: Operand =
    rule.value && typeof rule.value === "object" && "kind" in rule.value
      ? rule.value as Operand
      : { kind: "CONSTANT", value: rule.value as JsonValue };

  const updateLeft = (operand: Operand) => {
    actions.onPropChange(
      "meta",
      { ...meta, leftOperand: operand },
      path,
    );
  };

  return (
    <div className="rule">
      <OperandEditor
        allFieldTypes
        allowConstant={false}
        disabled={disabled}
        fields={fields}
        label="Field"
        onChange={updateLeft}
        operand={leftOperand}
        type={leftType}
      />
      <FormSelect
        aria-label="Operator"
        disabled={disabled}
        items={compatibleOperators(leftType, operators)}
        label="Operator"
        labelClassName="sr-only"
        onChange={(event) => actions.onPropChange(
          "operator",
          event.target.value,
          path,
        )}
        size="compact"
        value={rule.operator}
      />
      {definition?.valueShape === "NONE" ? null :
        definition?.valueShape === "SINGLE" ? (
          <OperandEditor
            allowConstant
            disabled={disabled}
            fields={fields}
            label="Value"
            onChange={(operand) => actions.onPropChange("value", operand, path)}
            operand={rightOperand}
            type={rule.operator === "WITHIN_LAST_N_MONTHS" ? "NUMBER" : leftType}
          />
        ) : (
          <CollectionValueEditor
            disabled={disabled}
            onChange={(value) => actions.onPropChange(
              "value",
              { kind: "CONSTANT", value },
              path,
            )}
            shape={definition?.valueShape === "RANGE" ? "RANGE" : "LIST"}
            type={leftType}
            value={rightOperand.kind === "CONSTANT" ? rightOperand.value : ""}
          />
        )}
      <GeneralButton
        aria-label="Remove condition"
        disabled={disabled}
        onClick={() => actions.onRuleRemove(path)}
        size="compact"
        type="button"
        variant="ghost"
      >
        Remove condition
      </GeneralButton>
    </div>
  );
}
