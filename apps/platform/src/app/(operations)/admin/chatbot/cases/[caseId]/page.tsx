import { ChatbotCaseWorkspace } from "@/modules/chatbot/ui/operations/ChatbotCaseWorkspace";
export default async function ChatbotSupportCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  return <ChatbotCaseWorkspace key={caseId} initialCaseId={caseId} />;
}
