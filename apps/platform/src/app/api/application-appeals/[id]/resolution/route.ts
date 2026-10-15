import { resolveApplicationAppeal } from "@/modules/applications/application/ServerApplicationAppealService";
import {
  appealRoute,
  readAppealBody,
} from "@/modules/applications/api/ApplicationAppealTransport";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return appealRoute(request, async (user) =>
    resolveApplicationAppeal(user, id, await readAppealBody(request)),
  );
}
