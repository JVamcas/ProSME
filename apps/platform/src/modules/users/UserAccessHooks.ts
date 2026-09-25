"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AuthorizationAuditListInput,
  UserAccessListInput,
} from "./UserAccessTypes";
import type {
  PromoteUserInput,
  UpdateRoleInput,
  UpdateUserInput,
} from "./UserAccessTransportTypes";
import { clientUserAccessService } from "./ClientUserAccessService";

export const userAccessQueryKeys = {
  all: ["admin", "user-access"] as const,
  audit: (input: AuthorizationAuditListInput) =>
    ["admin", "user-access", "audit", input] as const,
  view: (input: UserAccessListInput & AuthorizationAuditListInput) =>
    ["admin", "user-access", input] as const,
};

export function useUserAccess(
  input: UserAccessListInput & AuthorizationAuditListInput,
  enabled = true,
) {
  return useQuery({
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => clientUserAccessService.listAccess(input),
    queryKey: userAccessQueryKeys.view(input),
  });
}

function useRefreshAccess() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: userAccessQueryKeys.all });
  };
}

export function useUpdateUserAccess() {
  const refresh = useRefreshAccess();
  return useMutation({
    mutationFn: ({ input, userId }: { input: UpdateUserInput; userId: string }) =>
      clientUserAccessService.updateUser(userId, input),
    onSuccess: refresh,
  });
}

export function usePromoteUser() {
  const refresh = useRefreshAccess();
  return useMutation({
    mutationFn: ({ input, userId }: { input: PromoteUserInput; userId: string }) =>
      clientUserAccessService.promoteUser(userId, input),
    onSuccess: refresh,
  });
}

export function useInviteUser() {
  const refresh = useRefreshAccess();
  return useMutation({
    mutationFn: clientUserAccessService.inviteUser,
    onSuccess: refresh,
  });
}

export function useUpdateRole() {
  const refresh = useRefreshAccess();
  return useMutation({
    mutationFn: ({ input, roleId }: { input: UpdateRoleInput; roleId: string }) =>
      clientUserAccessService.updateRole(roleId, input),
    onSuccess: refresh,
  });
}

export function useAuthorizationAudit(input: AuthorizationAuditListInput) {
  return useQuery({
    queryFn: () => clientUserAccessService.listAudit(input),
    queryKey: userAccessQueryKeys.audit(input),
  });
}
