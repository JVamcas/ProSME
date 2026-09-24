import "server-only";

import { findWorkflowGraph } from "../../infrastructure/WorkflowGraphRepository";
import { validateWorkflowConfiguration } from "./ServerWorkflowSupport";

export async function readWorkflowReadinessProjection(versionId: string) {
  const record = await findWorkflowGraph(versionId);
  if (!record) return null;
  return {
    active: record.definition.active,
    graph: record.graph,
    status: record.version.status,
    validation: await validateWorkflowConfiguration(record.graph),
    versionId: record.version.id,
  };
}
