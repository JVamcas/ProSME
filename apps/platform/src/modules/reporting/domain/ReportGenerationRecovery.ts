export class ReportFinalizationPendingError extends Error {
  constructor() {
    super("Uploaded report output awaits database finalization.");
    this.name = "ReportFinalizationPendingError";
  }
}
