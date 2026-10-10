import assert from "node:assert/strict";
import { test } from "node:test";
import { componentReuseViolations } from "./check-component-reuse.mjs";

test("fails hardwired controls even when the existing component is imported", () => {
  const sources = new Map([
    [
      "shared/ui/Button.tsx",
      "export function GeneralButton() { return <button />; }",
    ],
    [
      "modules/chatbot/ui/Review.tsx",
      'import { GeneralButton } from "@/shared/ui/Button"; export function Review() { return <button>Approve</button>; }',
    ],
  ]);
  assert.match(
    componentReuseViolations(sources, ["modules/chatbot/ui/Review.tsx"])[0],
    /use existing GeneralButton/,
  );
});

test("allows shared composition and the owning primitive", () => {
  const sources = new Map([
    [
      "shared/ui/Button.tsx",
      "export function GeneralButton() { return <button />; }",
    ],
    [
      "modules/chatbot/ui/Review.tsx",
      "export function Review() { return <GeneralButton>Approve</GeneralButton>; }",
    ],
  ]);
  assert.deepEqual(componentReuseViolations(sources, [...sources.keys()]), []);
});

test("fails duplicate exported components under another feature", () => {
  const sources = new Map([
    ["shared/ui/Badge.tsx", "export function Badge() { return <span />; }"],
    [
      "modules/chatbot/ui/Badge.tsx",
      "export function Badge() { return <span />; }",
    ],
  ]);
  assert.match(
    componentReuseViolations(sources, ["modules/chatbot/ui/Badge.tsx"])[0],
    /already exists/,
  );
});

test("detects createElement hardwiring and leaves unchanged legacy files alone", () => {
  const sources = new Map([
    [
      "components/Legacy.tsx",
      "export function Legacy() { return <button />; }",
    ],
    [
      "modules/chatbot/ui/New.tsx",
      'export function New() { return React.createElement("input"); }',
    ],
  ]);
  assert.equal(
    componentReuseViolations(sources, ["modules/chatbot/ui/New.tsx"]).length,
    1,
  );
  assert.deepEqual(componentReuseViolations(sources, []), []);
});

test("rejects hardwired dialog roles as well as intrinsic dialogs", () => {
  const sources = new Map([
    [
      "modules/chatbot/ui/Review.tsx",
      'export function Review() { return <div role="dialog" />; }',
    ],
  ]);
  assert.match(
    componentReuseViolations(sources, [...sources.keys()])[0],
    /hardwiring a dialog role/,
  );
});
