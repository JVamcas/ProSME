import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { ConditionGroup } from "../domain/ConditionGroup";
import {
  deserializeConditionGroup,
  serializeConditionGroup,
} from "../domain/ConditionSerialization";
import { conditionGroups } from "./condition.schema";

export async function saveConditionGroup(
  group: ConditionGroup,
): Promise<ConditionGroup> {
  const definition = serializeConditionGroup(group);
  const [saved] = await getDatabase()
    .insert(conditionGroups)
    .values({
      id: definition.id,
      definition,
    })
    .onConflictDoUpdate({
      target: conditionGroups.id,
      set: {
        definition,
        updatedAt: new Date(),
      },
    })
    .returning({ definition: conditionGroups.definition });

  return deserializeConditionGroup(saved.definition);
}

export async function findConditionGroup(
  id: string,
): Promise<ConditionGroup | null> {
  const [stored] = await getDatabase()
    .select({ definition: conditionGroups.definition })
    .from(conditionGroups)
    .where(eq(conditionGroups.id, id))
    .limit(1);

  return stored ? deserializeConditionGroup(stored.definition) : null;
}
