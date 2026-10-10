// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { clientWorkflowService } from "@/modules/workflows/ClientWorkflowService";
import {
  renderWorkspace,
  chooseAction,
  expand,
  router,
  templateId,
  templateItem,
} from "../../../support/WorkflowTemplateListUiFixture";

describe("template definition form", () => {
  it("saves published parent metadata with definition concurrency and no version mutation", async () => {
    const parent = templateItem("PUBLISHED");
    vi.spyOn(clientWorkflowService, "listTemplates").mockResolvedValue({
      items: [parent],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    const update = vi
      .spyOn(clientWorkflowService, "updateTemplateDefinition")
      .mockResolvedValue({ id: templateId, updatedAt: parent.updatedAt });
    const clone = vi.spyOn(clientWorkflowService, "cloneDefinition");
    const versionEdit = vi.spyOn(clientWorkflowService, "updateDetails");
    const { container } = await renderWorkspace("PUBLISHED");
    await chooseAction(
      container,
      "Edit definition",
      "Actions for template Standard grant",
    );
    await act(async () =>
      document
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith(templateId, {
        code: parent.code,
        name: parent.name,
        description: parent.description,
        expectedUpdatedAt: parent.updatedAt,
      }),
    );
    expect(clone).not.toHaveBeenCalled();
    expect(versionEdit).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("creates an independent copy with an automatically generated code", async () => {
    const parent = templateItem("PUBLISHED");
    vi.spyOn(clientWorkflowService, "listTemplates").mockResolvedValue({
      items: [parent],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(clientWorkflowService, "listTemplateVersions").mockResolvedValue({
      items: [parent],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    const copy = vi
      .spyOn(clientWorkflowService, "copyTemplate")
      .mockResolvedValue({
        definition: { id: "independent-template" },
        version: { id: "draft-v1" },
      } as WorkflowEditorView);
    const { container } = await renderWorkspace("PUBLISHED");
    await expand(container);
    await chooseAction(container, "Create new template (v1)");
    expect(document.querySelector('input[name="code"]')).toBeNull();
    await act(async () =>
      document
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    await vi.waitFor(() =>
      expect(copy).toHaveBeenCalledWith(templateId, {
        name: "Copy of Standard grant",
        description: parent.description,
        sourceVersionId: parent.currentVersion.id,
        code: expect.stringMatching(/^COPY_OF_STANDARD_GRANT_[A-F0-9]{12}$/),
      }),
    );
    expect(router.push).toHaveBeenCalledWith(
      "/admin/workflows/independent-template?versionId=draft-v1",
    );
  });

  it("keeps a failed save open with an inline error", async () => {
    vi.spyOn(
      clientWorkflowService,
      "updateTemplateDefinition",
    ).mockRejectedValue(new Error("Reload the definition before saving."));
    const { container } = await renderWorkspace("PUBLISHED");
    await chooseAction(
      container,
      "Edit definition",
      "Actions for template Standard grant",
    );
    await act(async () =>
      document
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    await vi.waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        "Reload the definition",
      ),
    );
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
