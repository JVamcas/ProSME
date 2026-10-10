// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { clientWorkflowService } from "@/modules/workflows/ClientWorkflowService";
import {
  renderWorkspace,
  expand,
  chooseAction,
  router,
  templateId,
  versionId,
  olderVersionId,
  templateItem,
} from "../../../support/WorkflowTemplateListUiFixture";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";

function mockRefresh() {
  vi.spyOn(clientWorkflowService, "listTemplates").mockResolvedValue({
    items: [templateItem()],
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  });
  vi.spyOn(clientWorkflowService, "listTemplateVersions").mockResolvedValue({
    items: [templateItem()],
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  });
}

describe("exact version navigation", () => {
  it("links an existing draft to its exact editor without cloning or editing the definition", async () => {
    const clone = vi.spyOn(clientWorkflowService, "cloneDefinition");
    const update = vi.spyOn(clientWorkflowService, "updateTemplateDefinition");
    const { container } = await renderWorkspace();
    await expand(container);
    expect(
      container.querySelector(
        `a[href="/admin/workflows/${templateId}?versionId=${versionId}"]`,
      ),
    ).not.toBeNull();
    expect(clone).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it.each(["Create draft version"])(
    "%s forks the selected historical version and opens its resulting draft",
    async (action) => {
      mockRefresh();
      const clone = vi
        .spyOn(clientWorkflowService, "cloneDefinition")
        .mockResolvedValue({
          definition: { id: templateId },
          version: { id: "selected-source-draft" },
        } as WorkflowEditorView);
      const older = {
        ...templateItem("PUBLISHED", 1),
        isLatest: false,
        currentVersion: {
          ...templateItem("PUBLISHED", 1).currentVersion,
          id: olderVersionId,
        },
      };
      const { container } = await renderWorkspace("DRAFT", 2, undefined, [
        templateItem(),
        older,
      ]);
      await expand(container);
      await chooseAction(container, action, "Actions for Standard grant v1");
      await vi.waitFor(() =>
        expect(clone).toHaveBeenCalledWith(templateId, olderVersionId),
      );
      expect(router.push).toHaveBeenCalledWith(
        `/admin/workflows/${templateId}?versionId=selected-source-draft`,
      );
    },
  );
});
