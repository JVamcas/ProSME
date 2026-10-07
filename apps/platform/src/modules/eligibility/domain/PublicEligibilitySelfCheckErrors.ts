import { ResourceConflictError } from "@/lib/resource-errors";

export class PublicEligibilitySelfCheckChangedError extends ResourceConflictError {
  constructor() {
    super("The eligibility questions changed. Review them and try again.");
    this.name = "PublicEligibilitySelfCheckChangedError";
  }
}
