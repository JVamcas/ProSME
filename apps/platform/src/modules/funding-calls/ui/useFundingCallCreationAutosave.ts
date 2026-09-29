"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ClientRequestError } from "@/lib/client-http";
import type {
  FundingCallCreationProgressValues,
  FundingCallCreationStep,
} from "../api/FundingCallSchemas";
import type { FundingCallCreationProgressView } from "../api/FundingCallTransport";
import { useSaveFundingCallCreationProgress } from "../FundingCallHooks";

export const fundingCallAutosaveDelayMs = 900;

export type FundingCallSaveStatus =
  | "conflict"
  | "failed"
  | "offline"
  | "saved"
  | "saving";

type DraftSnapshot = {
  currentStep: FundingCallCreationStep;
  serialized: string;
  values: FundingCallCreationProgressValues;
};

function snapshot(
  currentStep: FundingCallCreationStep,
  values: FundingCallCreationProgressValues,
): DraftSnapshot {
  return {
    currentStep,
    serialized: JSON.stringify({ currentStep, values }),
    values,
  };
}

export function useFundingCallCreationAutosave(input: {
  currentStep: FundingCallCreationStep;
  enabled: boolean;
  initialProgress?: FundingCallCreationProgressView;
  values: FundingCallCreationProgressValues;
}) {
  const mutation = useSaveFundingCallCreationProgress();
  const initialSnapshot = snapshot(input.currentStep, input.values);
  const latest = useRef(initialSnapshot);
  const lastSaved = useRef(initialSnapshot.serialized);
  const expectedRowVersion = useRef(input.initialProgress?.rowVersion ?? null);
  const saving = useRef(false);
  const blocked = useRef<"conflict" | "failed" | null>(null);
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const [retryRevision, setRetryRevision] = useState(0);
  const [status, setStatus] = useState<FundingCallSaveStatus>("saved");
  const current = snapshot(input.currentStep, input.values);

  useEffect(() => {
    latest.current = current;
  }, [current]);

  useEffect(() => {
    const update = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (!isOnline) {
        setStatus("offline");
      } else if (latest.current.serialized !== lastSaved.current) {
        blocked.current = null;
        setStatus("saving");
        setRetryRevision((revision) => revision + 1);
      }
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!input.enabled || current.serialized === lastSaved.current) return;
    blocked.current = null;
    setStatus(online ? "saving" : "offline");
  }, [current.serialized, input.enabled, online]);

  const persist = useCallback(async () => {
    if (
      !input.enabled
      || !online
      || saving.current
      || blocked.current
      || latest.current.serialized === lastSaved.current
    ) {
      return;
    }

    const pending = latest.current;
    saving.current = true;
    setStatus("saving");
    try {
      const saved = await mutation.mutateAsync({
        currentStep: pending.currentStep,
        expectedRowVersion: expectedRowVersion.current,
        values: pending.values,
      });
      expectedRowVersion.current = saved.rowVersion;
      lastSaved.current = pending.serialized;
      if (latest.current.serialized === pending.serialized) {
        setStatus("saved");
      } else {
        setStatus("saving");
        setRetryRevision((revision) => revision + 1);
      }
    } catch (error) {
      const nextStatus =
        error instanceof ClientRequestError && error.code === "CONFLICT"
          ? "conflict"
          : navigator.onLine
            ? "failed"
            : "offline";
      blocked.current = nextStatus === "offline" ? null : nextStatus;
      setStatus(nextStatus);
    } finally {
      saving.current = false;
    }
  }, [input.enabled, mutation, online]);

  useEffect(() => {
    if (
      status !== "saving"
      || saving.current
      || latest.current.serialized === lastSaved.current
    ) {
      return;
    }
    const timer = window.setTimeout(
      () => void persist(),
      fundingCallAutosaveDelayMs,
    );
    return () => window.clearTimeout(timer);
  }, [current.serialized, persist, retryRevision, status]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (
        input.enabled
        && latest.current.serialized !== lastSaved.current
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [input.enabled]);

  return {
    error: mutation.error,
    retry: () => {
      blocked.current = null;
      setStatus(online ? "saving" : "offline");
      setRetryRevision((revision) => revision + 1);
    },
    status,
  };
}
