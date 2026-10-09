import { z } from "zod";

export const reportDescriptionSchema = z
  .string()
  .trim()
  .min(1, "Enter a description.")
  .max(2000, "Use no more than 2,000 characters.");
