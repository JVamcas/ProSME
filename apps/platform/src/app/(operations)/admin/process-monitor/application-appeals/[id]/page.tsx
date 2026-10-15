import { ApplicationAppealsQueue } from "@/modules/applications/ui/appeals/ApplicationAppealsQueue";
export default async function StaffApplicationAppealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ApplicationAppealsQueue initialAppealId={id} />;
}
