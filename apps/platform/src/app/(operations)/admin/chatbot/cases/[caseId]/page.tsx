import { ChatbotCaseDetail } from "@/modules/chatbot/ui/operations/ChatbotCaseDetail";
export default async function ChatbotSupportCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  return <ChatbotCaseDetail id={caseId} />;
}
