import type { WorkQueueListInput } from "../WorkQueueTypes";

export const workQueueQueryKeys = {
  all: ["admin", "work-queue"] as const,
  list: (input: WorkQueueListInput) => ["admin", "work-queue", input] as const,
  task: (taskId: string) => ["admin", "work-queue", "task", taskId] as const,
};
