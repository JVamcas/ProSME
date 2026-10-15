"use client";
import { postData, requestData } from "@/lib/client-http";
import type { z } from "zod";
import type {
  ApplicationAppeal,
  AppealCursor,
  AppealQueue,
} from "./domain/ApplicationAppeal";
import type {
  ApplicationAppealInput,
  appealAssignmentSchema,
  appealResolutionSchema,
} from "./api/ApplicationAppealSchemas";
const base = "/api/application-appeals";
export const clientApplicationAppealService = {
  submit: (values: ApplicationAppealInput) =>
    postData<{ reference: string }, ApplicationAppealInput>(
      "/api/public/application-appeals",
      values,
    ),
  list: (cursor?: AppealCursor, signal?: AbortSignal) =>
    requestData<AppealQueue>(`${base}?${new URLSearchParams(cursor)}`, {
      signal,
    }),
  detail: (id: string, signal?: AbortSignal) =>
    requestData<ApplicationAppeal>(`${base}/${encodeURIComponent(id)}`, {
      signal,
    }),
  assignees: (signal?: AbortSignal) =>
    requestData<{ id: string; name: string; email: string }[]>(
      `${base}/assignees`,
      { signal },
    ),
  assign: ({
    id,
    values,
  }: {
    id: string;
    values: z.infer<typeof appealAssignmentSchema>;
  }) => postData(`${base}/${encodeURIComponent(id)}/assignment`, values),
  resolve: ({
    id,
    values,
  }: {
    id: string;
    values: z.infer<typeof appealResolutionSchema>;
  }) => postData(`${base}/${encodeURIComponent(id)}/resolution`, values),
};
