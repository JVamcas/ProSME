import type { BusinessProfileInput } from "./BusinessSchemas";

export type BusinessView = BusinessProfileInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
