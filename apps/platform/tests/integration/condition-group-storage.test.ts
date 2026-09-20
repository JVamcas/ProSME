import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import {
  findConditionGroup,
  saveConditionGroup,
} from "@/modules/conditions/infrastructure/ConditionGroupRepository";

const enabled = process.env.RUN_P3_WORKFLOW_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const groupId = randomUUID();

afterAll(async () => {
  if (pool) {
    await pool.query("DELETE FROM app_condition_groups WHERE id = $1", [groupId]);
    await pool.end();
  }
});

(enabled ? describe : describe.skip)("condition group storage", () => {
  it("saves, updates, and reloads a nested group without structural loss", async () => {
    const group: ConditionGroup = {
      id: groupId,
      kind: "GROUP",
      combinator: "AND",
      children: [
        {
          id: randomUUID(),
          kind: "CONDITION",
          leftOperand: { kind: "FIELD", key: "application.requested_amount" },
          operator: basicOperators.EQUALS,
          rightOperand: { kind: "CONSTANT", value: 500_000 },
        },
        {
          id: randomUUID(),
          kind: "GROUP",
          combinator: "OR",
          children: [],
        },
      ],
    };

    expect(await saveConditionGroup(group)).toEqual(group);
    expect(await findConditionGroup(group.id)).toEqual(group);

    const updated = { ...group, combinator: "OR" as const };
    expect(await saveConditionGroup(updated)).toEqual(updated);
    expect(await findConditionGroup(group.id)).toEqual(updated);
  });
});
