"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { createQueryClient } from "@/shared/utils/createQueryClient";

type QueryProviderProps = {
  children: ReactNode;
  identity?: string;
};

function ScopedQueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(createQueryClient);

  useEffect(
    () => () => {
      void queryClient.cancelQueries();
      queryClient.clear();
    },
    [queryClient],
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function QueryProvider({
  children,
  identity = "public",
}: QueryProviderProps) {
  return <ScopedQueryProvider key={identity}>{children}</ScopedQueryProvider>;
}
