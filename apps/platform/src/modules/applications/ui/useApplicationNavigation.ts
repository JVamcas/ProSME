"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ownApplicationReadViewQuery,
  staffApplicationDetailQuery,
} from "./ApplicationDetailQueries";

export function useApplicationNavigation(
  applicationId: string,
  audience: "staff" | "applicant",
) {
  const client = useQueryClient();
  return () => {
    if (audience === "staff") {
      void client.prefetchQuery(staffApplicationDetailQuery(applicationId));
    } else {
      void client.prefetchQuery(ownApplicationReadViewQuery(applicationId));
    }
  };
}
