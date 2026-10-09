import type { ReportTemplateDefinition } from "../../domain/ReportDefinition";
import type { ConfiguredReport } from "../../domain/Report";

export type ReportBootstrapTemplate = {
  key: string;
  name: string;
  description: string;
  definition: ReportTemplateDefinition;
};
export type ReportBootstrapReport = {
  key: string;
  name: string;
  description: string;
  templateKey: string;
  defaults: ConfiguredReport["defaults"];
};
