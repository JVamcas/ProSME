import { getApplicationAppeal } from "@/modules/applications/application/ServerApplicationAppealService";
import { appealRoute } from "@/modules/applications/api/ApplicationAppealTransport";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return appealRoute(request, async (user) => getApplicationAppeal(user, id));
}
