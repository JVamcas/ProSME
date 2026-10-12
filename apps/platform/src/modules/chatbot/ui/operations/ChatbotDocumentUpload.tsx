"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FileUploadButton } from "@/shared/ui/FileUploadButton";
import { FieldError } from "@/shared/ui/FormPrimitives";
import {
  chatbotDocumentUploadFormSchema,
  type ChatbotDocumentUploadForm,
} from "../../api/ChatbotDocumentSchemas";
import { chatbotDocumentAccept } from "../../domain/ChatbotDocument";
import { useUploadChatbotDocument } from "./useChatbotDocuments";

export function ChatbotDocumentUpload({
  onUploaded,
}: {
  onUploaded: (id: string) => void;
}) {
  const mutation = useUploadChatbotDocument();
  const form = useForm<ChatbotDocumentUploadForm>({
    resolver: zodResolver(chatbotDocumentUploadFormSchema),
  });
  const submit = form.handleSubmit(async ({ file }) => {
    try {
      const uploaded = await mutation.mutateAsync(file);
      form.reset();
      onUploaded(uploaded.id);
    } catch {
      // Mutation feedback is shown by the domain hook.
    }
  });
  return (
    <div>
      <FileUploadButton
        label="Upload document"
        accept={chatbotDocumentAccept}
        variant="compact"
        uploading={mutation.isPending}
        onFile={(file) => {
          form.setValue("file", file, { shouldValidate: true });
          void submit();
        }}
      />
      <FieldError message={form.formState.errors.file?.message} />
    </div>
  );
}
