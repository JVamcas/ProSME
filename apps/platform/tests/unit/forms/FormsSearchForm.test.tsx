// @vitest-environment happy-dom

import { zodResolver } from "@hookform/resolvers/zod";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useForm } from "react-hook-form";
import { expect, it, vi } from "vitest";
import { formListSchema } from "@/modules/forms/api/FormSchemas";
import { FormsSearchForm } from "@/modules/forms/ui/staff/FormsSearchForm";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

it("applies and clears search through the shared filters and supports form submission", async () => {
  const onSearch = vi.fn();
  const onClear = vi.fn();
  function SearchForm() {
    const form = useForm({
      defaultValues: { search: "Finance" },
      resolver: zodResolver(formListSchema.pick({ search: true })),
    });
    return <FormsSearchForm form={form} onClear={onClear} onSearch={onSearch} />;
  }

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const button = (label: string) => {
    const match = Array.from(container.querySelectorAll("button")).find(
      (item) => item.textContent === label,
    );
    expect(match).toBeDefined();
    return match!;
  };

  try {
    await act(async () => root.render(<SearchForm />));
    expect(container.textContent).toContain("Form filters");
    await act(async () => button("Search").click());
    expect(onSearch.mock.calls[0][0]).toEqual({ search: "Finance" });
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(onSearch).toHaveBeenCalledTimes(2);
    await act(async () => button("Clear").click());
    expect(onClear).toHaveBeenCalledTimes(1);
    await act(async () => button("Hide filters").click());
    expect(container.querySelector("input")).toBeNull();
    await act(async () => button("Show filters").click());
    expect(container.querySelector("input")?.value).toBe("Finance");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
