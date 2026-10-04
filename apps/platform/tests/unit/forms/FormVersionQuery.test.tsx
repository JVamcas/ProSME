// @vitest-environment happy-dom

import { QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

vi.mock("@/modules/forms/ClientFormsService", () => ({
  clientFormsService: { get: vi.fn() },
}));

import { clientFormsService } from "@/modules/forms/ClientFormsService";
import { formQueryKeys, useFormEditor } from "@/modules/forms/FormHooks";
import { createQueryClient } from "@/shared/utils/createQueryClient";

it("loads an attached version independently of a cached latest form", async () => {
  const definitionId = "20000000-0000-4000-8000-000000000002";
  const versionId = "20000000-0000-4000-8000-000000000001";
  const latest = { version: { id: "latest", versionNumber: 2 } };
  const attached = { version: { id: versionId, versionNumber: 1 } };
  const client = createQueryClient();
  client.setQueryData(formQueryKeys.detail(definitionId), latest);
  vi.mocked(clientFormsService.get).mockResolvedValue(attached as never);
  function VersionView() {
    const query = useFormEditor(definitionId, versionId);
    return <p>{query.data?.version.id}</p>;
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <VersionView />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await vi.waitFor(() => {
        expect(client.getQueryData(formQueryKeys.version(definitionId, versionId)))
          .toEqual(attached);
      });
    });
    expect(clientFormsService.get).toHaveBeenCalledWith(definitionId, versionId);
    expect(container.textContent).toBe(versionId);
    expect(client.getQueryData(formQueryKeys.detail(definitionId))).toEqual(latest);
  } finally {
    await act(async () => root.unmount());
    client.clear();
  }
});
