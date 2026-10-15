import { getApplicationAppeals } from "@/modules/applications/application/ServerApplicationAppealService";
import { appealRoute } from "@/modules/applications/api/ApplicationAppealTransport";
export async function GET(request: Request) {
  return appealRoute(request, (user) =>
    getApplicationAppeals(
      user,
      Object.fromEntries(new URL(request.url).searchParams),
    ),
  );
}
