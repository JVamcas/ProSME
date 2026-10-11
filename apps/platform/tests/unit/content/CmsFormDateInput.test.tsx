// @vitest-environment happy-dom

import { act, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import type { DateFieldClientProps } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FormDateInputProps } from "@/shared/ui/FormDateInput";

const state = vi.hoisted(() => ({
  value: "2026-10-11T12:00:00.000Z" as string | null,
  disabled: false,
  showError: false,
  errorMessage: "Invalid publication date",
  setValue: vi.fn(),
  useField: vi.fn(),
  props: {} as FormDateInputProps,
}));

vi.mock("@payloadcms/translations", () => ({
  getTranslation: (value: unknown) => value,
}));
vi.mock("@payloadcms/ui", () => ({
  withCondition: (component: ComponentType) => component,
  useTranslation: () => ({ i18n: {} }),
  useField: (options: unknown) => {
    state.useField(options);
    return { ...state, path: "publishedAt" };
  },
  FieldDescription: () => null,
}));
vi.mock("@/shared/ui/FormDateInput", () => ({
  FormDateInput: (props: FormDateInputProps) => {
    state.props = props;
    return <div data-shared-date-input />;
  },
}));

import CmsFormDateInput from "@/modules/content/ui/admin/CmsFormDateInput";

const props = {
  path: "publishedAt",
  field: { name: "publishedAt", type: "date", label: "Published At", required: true },
} as DateFieldClientProps;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state, {
    value: "2026-10-11T12:00:00.000Z",
    disabled: false,
    showError: false,
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("Payload app date input", () => {
  it("shows saved ISO dates through the existing FormDateInput", async () => {
    await act(async () => root.render(<CmsFormDateInput {...props} />));
    expect(container.querySelector("[data-shared-date-input]")).not.toBeNull();
    expect(state.props).toMatchObject({
      name: "publishedAt",
      label: "Published At",
      required: true,
      value: "2026-10-11",
    });
    state.props.onChangeValue?.("2026-10-12");
    expect(state.setValue).toHaveBeenCalledWith(
      new Date("2026-10-12T12:00:00").toISOString(),
    );
  });

  it("clears optional dates with null and ignores invalid selections", async () => {
    state.value = null;
    await act(async () => root.render(<CmsFormDateInput {...props} />));
    expect(state.props.value).toBe("");
    state.props.onChangeValue?.("");
    expect(state.setValue).toHaveBeenCalledWith(null);
    state.setValue.mockClear();
    state.props.onChangeValue?.("invalid");
    expect(state.setValue).not.toHaveBeenCalled();
  });

  it.each(["readOnly", "disabled"])("prevents changes when %s", async (flag) => {
    state.disabled = flag === "disabled";
    await act(async () => root.render(
      <CmsFormDateInput {...props} readOnly={flag === "readOnly"} />,
    ));
    expect(state.props.disabled).toBe(true);
    state.props.onChangeValue?.("2026-10-12");
    state.props.onChangeValue?.("");
    expect(state.setValue).not.toHaveBeenCalled();
  });

  it("retains Payload validation and displays its errors", async () => {
    state.showError = true;
    const validate = vi.fn().mockReturnValue("Invalid publication date");
    await act(async () => root.render(<CmsFormDateInput {...props} validate={validate} />));
    expect(state.props.error).toBe("Invalid publication date");
    const validator = state.useField.mock.calls.at(-1)![0].validate;
    expect(await validator(null, {})).toBe("Invalid publication date");
    expect(validate).toHaveBeenCalledWith(null, {
      name: "publishedAt",
      type: "date",
      required: true,
    });
  });
});
