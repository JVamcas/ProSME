"use client";

import { useState } from "react";

type FormStep = {
  id: string;
};

function completedStepsStorageKey(stepPersistenceKey: string) {
  return `${stepPersistenceKey}:completed`;
}

function readCurrentStepId(stepPersistenceKey?: string) {
  if (!stepPersistenceKey || typeof window === "undefined") return undefined;

  try {
    return sessionStorage.getItem(stepPersistenceKey) ?? undefined;
  } catch {
    return undefined;
  }
}

function readCompletedStepIds(
  currentStepId: string | undefined,
  stepPersistenceKey: string | undefined,
  steps: readonly FormStep[],
) {
  if (!stepPersistenceKey || typeof window === "undefined") return [];

  try {
    const saved = sessionStorage.getItem(
      completedStepsStorageKey(stepPersistenceKey),
    );
    if (saved) {
      const parsedIds: unknown = JSON.parse(saved);
      if (Array.isArray(parsedIds)) {
        return parsedIds.filter((id): id is string => typeof id === "string");
      }
    }
    const currentIndex = steps.findIndex((step) => step.id === currentStepId);
    return currentIndex > 0
      ? steps.slice(0, currentIndex).map((step) => step.id)
      : [];
  } catch {
    return [];
  }
}

export function useFormStepProgress({
  persistenceKey,
  steps,
}: {
  persistenceKey?: string;
  steps: readonly FormStep[];
}) {
  const [currentStepId, setCurrentStepId] = useState<string | undefined>(() =>
    readCurrentStepId(persistenceKey),
  );
  const [completedStepIds, setCompletedStepIds] = useState<string[]>(() =>
    readCompletedStepIds(currentStepId, persistenceKey, steps),
  );

  function navigateToStep(stepId: string | undefined) {
    if (!stepId) return;
    setCurrentStepId(stepId);
    if (!persistenceKey) return;

    try {
      sessionStorage.setItem(persistenceKey, stepId);
    } catch {
      // Navigation still works if browser storage is unavailable.
    }
  }

  function markStepComplete(stepId: string | undefined) {
    if (!stepId || completedStepIds.includes(stepId)) return;
    const nextCompletedStepIds = [...completedStepIds, stepId];
    setCompletedStepIds(nextCompletedStepIds);
    if (!persistenceKey) return;

    try {
      sessionStorage.setItem(
        completedStepsStorageKey(persistenceKey),
        JSON.stringify(nextCompletedStepIds),
      );
    } catch {
      // Progress remains available for the current browser session in state.
    }
  }

  return {
    completedStepIds,
    currentStepId,
    markStepComplete,
    navigateToStep,
  };
}
