"use client";

import { createContext, useContext } from "react";

import type {
  ConditionFieldDefinition,
  ConditionOperatorDefinition,
} from "../../domain/ConditionConfiguration";

type ConditionBuilderControlContextValue = {
  fields: readonly ConditionFieldDefinition[];
  operators: readonly ConditionOperatorDefinition[];
};

const ConditionBuilderControlContext = createContext<
  ConditionBuilderControlContextValue | undefined
>(undefined);

export const ConditionBuilderControlProvider =
  ConditionBuilderControlContext.Provider;

export function useConditionBuilderControls() {
  const value = useContext(ConditionBuilderControlContext);
  if (!value) {
    throw new Error("Condition builder controls require their provider.");
  }
  return value;
}
