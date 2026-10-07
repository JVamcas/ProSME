// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  registerMap: vi.fn(),
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  observe: vi.fn(),
  disconnect: vi.fn(),
  resizeCallback: null as (() => void) | null,
}));
vi.mock("@/shared/ui/EChartRuntime", () => ({
  init: mocks.init,
  registerMap: mocks.registerMap,
}));
import { EChart, type EChartMap } from "@/shared/ui/EChart";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.init.mockReturnValue({
    setOption: mocks.setOption,
    resize: mocks.resize,
    dispose: mocks.dispose,
  });
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { mocks.resizeCallback = callback; }
    observe = mocks.observe;
    disconnect = mocks.disconnect;
  });
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

async function mount(option = { series: [] }) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<EChart option={option} label="Chart" />));
  return container;
}

describe("shared ECharts lifecycle", () => {
  it("initializes an accessible 360px SVG chart and updates without rebuilding", async () => {
    const container = await mount();
    expect(container.querySelector('[aria-label="Chart"]')?.getAttribute("style"))
      .toContain("height: 360px");
    expect(mocks.init).toHaveBeenCalledWith(
      expect.any(HTMLElement), undefined, { renderer: "svg" },
    );
    const next = { series: [{ type: "line", data: [2, 3] }] };
    await act(async () => root!.render(<EChart option={next} label="Chart" />));
    expect(mocks.init).toHaveBeenCalledOnce();
    expect(mocks.setOption).toHaveBeenLastCalledWith(next, {
      replaceMerge: ["series", "graphic", "visualMap"],
    });
    mocks.resizeCallback?.();
    expect(mocks.resize).toHaveBeenCalledOnce();
    await act(async () => root!.unmount());
    root = undefined;
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });

  it("registers the source geometry before initializing a map chart", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const map: EChartMap = {
      name: "sample",
      geoJSON: { type: "FeatureCollection", features: [] },
    };
    await act(async () => root!.render(<EChart map={map} option={{}} label="Map" />));
    expect(mocks.registerMap).toHaveBeenCalledWith(map.name, map.geoJSON);
    expect(mocks.registerMap.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.init.mock.invocationCallOrder[0],
    );
  });
});
