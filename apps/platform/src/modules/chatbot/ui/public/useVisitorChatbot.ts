"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { ClientRequestError } from "@/lib/client-http";
import { clientChatbotConversationService as client } from "../../ClientChatbotConversationService";
import {
  type chatbotContactSchema,
  chatbotSessionSchema,
  type chatbotTurnSchema,
} from "../../api/ChatbotConversationSchemas";
import type {
  ChatbotNotice,
  ChatbotSession,
  VisitorChatbotTurn,
} from "../../domain/ChatbotConversation";

export function useChatbotNotice() {
  return useQuery({
    queryKey: ["chatbot", "public", "notice"],
    queryFn: ({ signal }) => client.notice(signal),
    staleTime: 0,
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useVisitorChatbot(notice: ChatbotNotice) {
  // Credentials, questions and contact details never enter query caches or
  // browser storage. Private mutations are removed as soon as unobserved.
  const [session, setSession] = useState<ChatbotSession | null>(null);
  const [turns, setTurns] = useState<VisitorChatbotTurn[]>([]);
  const [expired, setExpired] = useState(false);
  const deadline = useRef(0);
  const sessionIdentity = useRef<string | null>(null);
  const pendingTurn = useRef<z.infer<typeof chatbotTurnSchema> | null>(null);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(
      () => {
        setExpired(true);
        sessionIdentity.current = null;
        setSession(null);
        setTurns([]);
        pendingTurn.current = null;
      },
      Math.max(0, deadline.current - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [session]);

  function requireSession() {
    if (!session || Date.now() >= deadline.current) {
      throw new Error("This session has expired. Start a new conversation.");
    }
    return session;
  }

  function checkExpiry(error: unknown, id: string) {
    if (
      error instanceof ClientRequestError &&
      error.status === 401 &&
      sessionIdentity.current === id
    ) {
      setExpired(true);
      sessionIdentity.current = null;
      setSession(null);
      setTurns([]);
      pendingTurn.current = null;
    }
  }

  const start = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: (values: z.infer<typeof chatbotSessionSchema>) =>
      client.start(values),
    onSuccess: (created) => {
      deadline.current = Date.now() + created.sessionMinutes * 60_000;
      sessionIdentity.current = created.id;
      setSession(created);
      setExpired(false);
    },
  });

  const contact = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: (values: z.infer<typeof chatbotContactSchema>) => {
      const current = requireSession();
      return client.contact(current, values).catch((error) => {
        checkExpiry(error, current.id);
        throw error;
      });
    },
  });
  const resetContact = contact.reset;

  const question = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (
      values: Omit<z.infer<typeof chatbotTurnSchema>, "turnId">,
    ) => {
      // Sending the first question accepts the notice beside the composer.
      // Opening the panel alone never creates a conversation.
      const current = session
        ? requireSession()
        : await start.mutateAsync(
            chatbotSessionSchema.parse({
              noticeVersion: notice.noticeVersion,
              consent: true,
            }),
          );
      const previous = pendingTurn.current;
      // A lost response is retried with the same input and identity, so the
      // server can replay it without a duplicate case or notification.
      const input =
        previous &&
        previous.question === values.question &&
        previous.fundingCallId === values.fundingCallId
          ? previous
          : { ...values, turnId: crypto.randomUUID() };
      pendingTurn.current = input;
      const response = await client.question(current, input).catch((error) => {
        checkExpiry(error, current.id);
        throw error;
      });
      if (
        sessionIdentity.current === current.id &&
        Date.now() < deadline.current
      ) {
        if (
          response.caseId &&
          response.caseId !== turns.findLast((turn) => turn.caseId)?.caseId
        ) {
          resetContact();
        }
        setTurns((history) =>
          [
            ...history,
            { ...response, id: input.turnId, question: values.question },
          ].slice(-30),
        );
      }
      if (pendingTurn.current === input) pendingTurn.current = null;
      return response;
    },
  });

  const resetStart = start.reset;
  const resetQuestion = question.reset;

  useEffect(() => {
    if (!expired) return;
    resetStart();
    resetQuestion();
    resetContact();
  }, [expired, resetStart, resetQuestion, resetContact]);

  function reset() {
    deadline.current = 0;
    sessionIdentity.current = null;
    pendingTurn.current = null;
    setSession(null);
    setTurns([]);
    setExpired(false);
    start.reset();
    question.reset();
    contact.reset();
  }

  return { session, turns, expired, start, question, contact, reset };
}
