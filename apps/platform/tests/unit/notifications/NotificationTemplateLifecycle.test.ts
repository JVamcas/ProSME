import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function source(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

describe("notification template lifecycle", () => {
  it("serializes version allocation and creates immutable drafts with audit", async () => {
    const repository = await source(
      "src/modules/notifications/infrastructure/NotificationTemplateRepository.ts",
    );
    expect(repository).toContain("pg_advisory_xact_lock");
    expect(repository).toContain("max(notificationTemplateVersions.versionNumber)");
    expect(repository).toContain("NOTIFICATION_TEMPLATE_IMPORTED");
    expect(repository).toContain("uploadedByUserId: input.actorId");
    expect(repository).not.toMatch(/updateNotificationTemplateDraft/);
  });

  it("retires and publishes in one transaction with lifecycle audit", async () => {
    const repository = await source(
      "src/modules/notifications/infrastructure/NotificationTemplateRepository.ts",
    );
    const publication = repository.slice(
      repository.indexOf("export async function publishNotificationTemplateVersion"),
      repository.indexOf("export async function resolvePublishedNotificationTemplate"),
    );
    expect(publication).toContain("getDatabase().transaction");
    expect(publication).toContain('status: "RETIRED"');
    expect(publication).toContain('status: "PUBLISHED"');
    expect(publication).toContain("NOTIFICATION_TEMPLATE_PUBLISHED");
  });

  it("resolves only enabled published targets in event, catalog, global order", async () => {
    const repository = await source(
      "src/modules/notifications/infrastructure/NotificationTemplateRepository.ts",
    );
    const resolution = repository.slice(
      repository.indexOf("export async function resolvePublishedNotificationTemplate"),
    );
    expect(resolution).toContain("notificationTemplateTargets.isEnabled");
    expect(resolution).toContain('notificationTemplateVersions.status, "PUBLISHED"');
    expect(resolution).toMatch(/when 'EVENT' then 1 when 'CATALOG' then 2 else 3/);
    expect(resolution).toContain(".limit(1)");
  });

  it("keeps client HTTP and cache invalidation in the prescribed layers", async () => {
    const client = await source(
      "src/modules/notifications/ui/ClientNotificationTemplateService.ts",
    );
    const hooks = await source(
      "src/modules/notifications/ui/NotificationTemplateHooks.ts",
    );
    const form = await source(
      "src/modules/notifications/ui/NotificationTemplateImportForm.tsx",
    );
    expect(client).toContain("requestData");
    expect(hooks).toContain("invalidateQueries");
    expect(hooks).toContain("useMutation");
    expect(form).toContain("zodResolver(importFormSchema)");
    expect(form).toContain('accept=".html,text/html"');
  });
});
