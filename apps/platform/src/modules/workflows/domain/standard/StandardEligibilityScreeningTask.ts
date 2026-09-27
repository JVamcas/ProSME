import { task } from "./StandardWorkflowBuilders";
import type { StandardWorkflowDependencies } from "./StandardWorkflowTypes";

export function eligibilityVerificationTask(
  dependencies: StandardWorkflowDependencies,
) {
  return task(dependencies, {
    actionKeys: [],
    taskType: "CONTRIBUTING",
    config: {},
    description:
      "Record the verified eligibility facts used by authoritative Screening.",
    displayOrder: 2,
    formCode: "ELIGIBILITY_VERIFICATION",
    name: "Eligibility evidence verification",
    roleCode: "programme_officer",
    stableKey: "ELIGIBILITY_VERIFICATION",
  });
}
