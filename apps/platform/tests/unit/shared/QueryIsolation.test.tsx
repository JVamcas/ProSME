// @vitest-environment happy-dom

import { useQueryClient } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { ClientRequestError } from "@/lib/client-http";
import {
  createQueryClient,
  queryIdentity,
} from "@/shared/utils/createQueryClient";
import { QueryProvider } from "@/shared/ui/portal/query-provider";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it.each([401, 403, 404])(
  "erases stale protected data after a %s refetch without retry",
  async (status) => {
    const client = createQueryClient();
    const queryKey = ["protected", "record-1"];
    client.setQueryData(queryKey, { sensitive: "previously allowed" });
    let attempts = 0;
    await expect(
      client.fetchQuery({
        queryKey,
        staleTime: 0,
        queryFn: () => {
          attempts += 1;
          throw new ClientRequestError("Access denied", status);
        },
      }),
    ).rejects.toMatchObject({ status });
    expect(attempts).toBe(1);
    expect(client.getQueryData(queryKey)).toBeUndefined();
    expect(client.getQueryState(queryKey)?.status).toBe("error");
    client.clear();
  },
);

describe("cache identity", () => {
  it("changes with actor, roles or permissions but is stable across set ordering", () => {
    const identity = queryIdentity("actor-a", ["read", "write"], ["reviewer"]);
    expect(identity).toBe(
      queryIdentity("actor-a", ["write", "read"], ["reviewer"]),
    );
    expect(identity).not.toBe(
      queryIdentity("actor-b", ["read", "write"], ["reviewer"]),
    );
    expect(identity).not.toBe(queryIdentity("actor-a", ["read"], ["reviewer"]));
    expect(identity).not.toBe(
      queryIdentity("actor-a", ["read", "write"], ["other-role"]),
    );
  });

  it("disposes old payloads and mounts a fresh cache before rendering a changed identity", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const clients: ReturnType<typeof createQueryClient>[] = [];
    function InspectCache() {
      const client = useQueryClient();
      clients.push(client);
      return <p>{String(client.getQueryData(["secret"]) ?? "empty")}</p>;
    }
    await act(async () =>
      root.render(
        <QueryProvider identity="account-a">
          <InspectCache />
        </QueryProvider>,
      ),
    );
    const oldClient = clients[0];
    oldClient.setQueryData(["secret"], "account-a-data");
    await act(async () =>
      root.render(
        <QueryProvider identity="account-b">
          <InspectCache />
        </QueryProvider>,
      ),
    );
    expect(container.textContent).toBe("empty");
    expect(clients.at(-1)).not.toBe(oldClient);
    expect(oldClient.getQueryCache().getAll()).toHaveLength(0);
    await act(async () => root.unmount());
  });
});

it("cancels in-flight reads and ignores their late payloads after an account change", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const clients: ReturnType<typeof createQueryClient>[] = [];
  function InspectCache() {
    const client = useQueryClient();
    clients.push(client);
    return <p>{String(client.getQueryData(["record"]) ?? "empty")}</p>;
  }
  await act(async () =>
    root.render(
      <QueryProvider identity="account-a">
        <InspectCache />
      </QueryProvider>,
    ),
  );
  const oldClient = clients[0];
  let finish!: (value: string) => void;
  let requestSignal!: AbortSignal;
  const pending = oldClient
    .fetchQuery({
      queryKey: ["record"],
      queryFn: ({ signal }) => {
        requestSignal = signal;
        return new Promise<string>((resolve) => {
          finish = resolve;
        });
      },
    })
    .catch(() => undefined);
  await act(async () =>
    root.render(
      <QueryProvider identity="account-b">
        <InspectCache />
      </QueryProvider>,
    ),
  );
  expect(requestSignal.aborted).toBe(true);
  finish("account-a-private-record");
  await pending;
  expect(oldClient.getQueryCache().getAll()).toHaveLength(0);
  expect(clients.at(-1)?.getQueryData(["record"])).toBeUndefined();
  expect(container.textContent).toBe("empty");
  await act(async () => root.unmount());
});
