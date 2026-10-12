"use client";

import { RightDrawer } from "@/shared/ui/RightDrawer";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useChatbotDocument } from "./useChatbotDocuments";

export function ChatbotDocumentPreview({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const query = useChatbotDocument(id);
  return (
    <RightDrawer
      open={Boolean(id)}
      onClose={onClose}
      title="Knowledge document"
      description="Review the extracted text. Activating this document makes its text available to website visitors and chatbot answers."
    >
      <QuerySection
        query={query}
        loading={<Skeleton className="h-48" />}
        title="knowledge document"
      >
        {(document) => (
          <article className="space-y-4">
            <h2 className="font-semibold">{document.name}</h2>
            <p className="text-sm text-brand-navy/60">{document.fileName}</p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {document.text}
            </div>
          </article>
        )}
      </QuerySection>
    </RightDrawer>
  );
}
