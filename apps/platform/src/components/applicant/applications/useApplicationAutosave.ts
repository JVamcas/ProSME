"use client";

import { useEffect, useRef, useState } from "react";
import {
  type FieldValues,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";

export function useApplicationAutosave<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  onSave: (values: TValues) => Promise<unknown>,
) {
  const values = useWatch({ control: form.control }) as TValues;
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const lastAttempt = useRef("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const serialized = JSON.stringify(values);
    if (
      !form.formState.isDirty ||
      !online ||
      serialized === lastAttempt.current
    ) {
      return;
    }
    const timeout = window.setTimeout(async () => {
      lastAttempt.current = serialized;
      setSaving(true);
      try {
        await onSave(values);
        if (JSON.stringify(form.getValues()) === serialized) form.reset(values);
      } catch {
        // Mutation state renders the recoverable error and explicit retry action.
      } finally {
        setSaving(false);
      }
    }, 1_500);
    return () => window.clearTimeout(timeout);
  }, [form, form.formState.isDirty, onSave, online, values]);

  return { online, saving };
}
