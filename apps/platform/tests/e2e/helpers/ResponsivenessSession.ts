import { readFile } from "node:fs/promises";
import type { BrowserContext } from "playwright/test";

export const responsivenessSessionFile = process.env.RESPONSIVENESS_SESSION;
export const responsivenessApplicationId =
  "66666666-6666-4666-8666-666666666661";

export async function installResponsivenessSession(
  context: BrowserContext,
  sessionFile = responsivenessSessionFile,
) {
  if (!sessionFile) throw new Error("A private synthetic session is required.");
  const { cookie } = JSON.parse(await readFile(sessionFile, "utf8")) as {
    cookie: string;
  };
  const baseURL =
    process.env.RESPONSIVENESS_BASE_URL ?? "http://localhost:3018";
  await context.addCookies([
    {
      name: "__Host-smefund_session",
      value: cookie,
      url: baseURL.replace("http:", "https:"),
      secure: true,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
