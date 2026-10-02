import { describe, expect, it } from "vitest";

import { workflowRouteGeometry } from "@/modules/workflows/ui/definitions/WorkflowVisualRoute";

describe("workflow connector geometry", () => {
  it.each([180, -180])(
    "uses rounded right-angle bends for a forward route with vertical offset %i",
    (offset) => {
      const geometry = workflowRouteGeometry(
        { x: 0, y: 0 },
        { x: 464, y: offset },
        1,
      );

      expect(geometry.path).toMatch(/^M 264 66 L 349\.5 66 Q 359\.5 66/);
      expect(geometry.path.match(/ Q /g)).toHaveLength(2);
      expect(geometry.path).not.toContain(" C ");
      expect(geometry.path).toMatch(new RegExp(`L 455 ${offset + 66}$`));
      expect(geometry.labelX).toBe(359.5);
      expect(geometry.labelY).toBe(offset / 2 + 66);
    },
  );

  it("keeps aligned routes horizontal without invalid corner coordinates", () => {
    const geometry = workflowRouteGeometry(
      { x: 0, y: 0 },
      { x: 464, y: 0 },
      1,
    );

    const coordinates = geometry.path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const remainsHorizontal = coordinates.every(
      (value, index) => index % 2 === 0 || value === 66,
    );
    expect(remainsHorizontal).toBe(true);
    expect(geometry.path).not.toMatch(/NaN|Infinity/);
  });

  it("clamps corner rounding when the stages are close vertically", () => {
    const geometry = workflowRouteGeometry(
      { x: 0, y: 0 },
      { x: 464, y: 4 },
      1,
    );

    expect(geometry.path).toContain("Q 359.5 66 359.5 68");
    expect(geometry.path).toContain("Q 359.5 70 361.5 70");
  });

  it("routes backward connections below the cards with four rounded corners", () => {
    const geometry = workflowRouteGeometry(
      { x: 464, y: 0 },
      { x: 0, y: 0 },
      1,
      200,
      132,
    );

    expect(geometry.path).toMatch(/^M 728 100 L 774 100 Q 784 100 784 110/);
    expect(geometry.path.match(/ Q /g)).toHaveLength(4);
    expect(geometry.path).toContain("L -38 247 Q -48 247 -48 237");
    expect(geometry.path).toMatch(/L -9 66$/);
    expect(geometry.labelY).toBe(247);
    expect(geometry.right).toBe(784);
  });

  it("honours an explicit detour for a forward connection", () => {
    const geometry = workflowRouteGeometry(
      { x: 0, y: 0 },
      { x: 464, y: 0 },
      1,
      132,
      132,
      400,
    );

    expect(geometry.path.match(/ Q /g)).toHaveLength(4);
    expect(geometry.path).toContain("L 406 400 Q 416 400 416 390");
    expect(geometry.path).toMatch(/L 455 66$/);
    expect(geometry.labelY).toBe(400);
    expect(geometry.bottom).toBe(436);
  });
});
