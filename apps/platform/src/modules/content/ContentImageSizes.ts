export const cmsImageSizes = [
  { name: "thumbnail", width: 320 },
  { name: "mobile", width: 640 },
  { name: "tablet", width: 1024 },
  { name: "desktop", width: 1600 },
] as const;

export type CmsImageSize = (typeof cmsImageSizes)[number]["name"];

export const cmsImageFormatOptions = {
  format: "webp",
  options: { quality: 75, effort: 4 },
} as const;
