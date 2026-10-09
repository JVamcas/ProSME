"use client";
import { useEffect } from "react";
import { toast } from "./Toast";
import { getErrorMessage } from "@/lib/client-http";

export function useQueryErrorToast(query: {
  error: unknown;
  errorUpdatedAt: number;
}) {
  useEffect(() => {
    if (query.error) {
      toast.error(
        getErrorMessage(query.error) ?? "The request could not be completed.",
      );
    }
  }, [query.error, query.errorUpdatedAt]);
}
