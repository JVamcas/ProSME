import { z } from "zod";

export const brandingLogoMaximumBytes = 2 * 1024 * 1024;

export const brandingLogoUploadSchema = z.object({
  logo: z.custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    { error: "Choose a logo file." },
  ),
});

export type BrandingSettingsView = {
  hasLogo: boolean;
  logoContentType: string | null;
  logoFileName: string | null;
  logoUrl: string;
  storagePrefix: string;
  updatedAt: string | null;
};
