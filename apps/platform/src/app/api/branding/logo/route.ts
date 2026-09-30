import { readBrandingLogo } from "@/modules/branding/application/ServerBrandingService";

export async function GET() {
  try {
    const logo = await readBrandingLogo();
    return new Response(new Uint8Array(logo.body), {
      headers: {
        "Cache-Control": logo.updatedAt
          ? "public, max-age=3600, stale-while-revalidate=86400"
          : "public, max-age=300",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Type": logo.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
