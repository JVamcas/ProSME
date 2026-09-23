"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ClientRequestError } from "@/lib/client-http";
import { useUpdateApplication } from "../ApplicationHooks";
import type { ApplicationDraftView } from "../ApplicationTypes";
import type { DynamicFormValues } from "@/modules/forms/ui/renderer/FormRenderer";

export const applicationDraftAutosaveDelayMs = 900;

export type DraftSaveStatus =
  | "conflict"
  | "failed"
  | "offline"
  | "saved"
  | "saving";

type PendingSave = {
  expectedApplicationRowVersion: number;
  expectedResponseRowVersion: number;
  idempotencyKey: string;
  revision: number;
  values: DynamicFormValues;
};

export function useApplicationAutosave(
  applicationId: string,
  data: ApplicationDraftView,
) {
  const mutation = useUpdateApplication(applicationId);
  const [values, setValues] = useState<DynamicFormValues>(
    data.draftResponse.values,
  );
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const [status, setStatus] = useState<DraftSaveStatus>("saved");
  const revision = useRef(0);
  const lastAttemptedRevision = useRef(0);
  const applicationRowVersion = useRef(data.rowVersion);
  const responseRowVersion = useRef(data.draftResponse.rowVersion);
  const pendingSave = useRef<PendingSave | null>(null);

  useEffect(() => {
    const update = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (!isOnline && status !== "conflict") setStatus("offline");
      if (isOnline && status === "offline") setStatus("saving");
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [status]);

  const changeValues = useCallback((next: DynamicFormValues) => {
    revision.current += 1;
    pendingSave.current = null;
    setValues(next);
    setStatus(navigator.onLine ? "saving" : "offline");
  }, []);

  const persist = useCallback((retry = false) => {
    if (mutation.isPending || !online || status === "conflict") return;
    const request = retry && pendingSave.current
      ? pendingSave.current
      : {
          expectedApplicationRowVersion: applicationRowVersion.current,
          expectedResponseRowVersion: responseRowVersion.current,
          idempotencyKey: crypto.randomUUID(),
          revision: revision.current,
          values,
        };
    pendingSave.current = request;
    lastAttemptedRevision.current = request.revision;
    setStatus("saving");
    mutation.mutate(request, {
      onError: (error) => {
        if (error instanceof ClientRequestError && error.code === "CONFLICT") {
          setStatus("conflict");
          return;
        }
        setStatus(navigator.onLine ? "failed" : "offline");
      },
      onSuccess: (saved) => {
        applicationRowVersion.current = saved.rowVersion;
        responseRowVersion.current = saved.draftResponse.rowVersion;
        pendingSave.current = null;
        if (revision.current === request.revision) {
          setValues(saved.draftResponse.values);
          setStatus("saved");
        }
      },
    });
  }, [mutation, online, status, values]);

  useEffect(() => {
    if (
      status !== "saving"
      || mutation.isPending
      || !online
      || lastAttemptedRevision.current === revision.current
    ) {
      return;
    }
    const timer = window.setTimeout(
      () => persist(),
      applicationDraftAutosaveDelayMs,
    );
    return () => window.clearTimeout(timer);
  }, [mutation.isPending, online, persist, status]);

  return {
    error: mutation.error,
    online,
    retry: () => persist(true),
    setValues: changeValues,
    status,
    values,
  };
}
