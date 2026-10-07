import "server-only";

import { z } from "zod";

const configurationSchema = z.object({
  propertyId: z.string().regex(/^\d+$/),
  collectionStart: z.iso.date(),
  timezone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }),
});

export function googleAnalyticsConfiguration() {
  const result = configurationSchema.safeParse({
    propertyId: process.env.GA_PROPERTY_ID,
    collectionStart: process.env.GA_COLLECTION_START_DATE,
    timezone: process.env.GA_PROPERTY_TIMEZONE,
  });
  return result.success ? result.data : null;
}

export type GoogleAnalyticsConfiguration = NonNullable<
  ReturnType<typeof googleAnalyticsConfiguration>
>;
