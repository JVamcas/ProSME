import { NextResponse } from "next/server";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  AuthenticationRequiredError,
  PermissionDeniedError,
  requireAnyCapability,
} from "@/auth/authorization/policy";
import { capabilities } from "@/auth/authorization/capabilities";
import { getApplications } from "@/modules/applications/application.service";

export const dynamic = "force-dynamic";

function authorizationError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return NextResponse.json(
      {
        error: "Authentication is required.",
      },
      {
        status: 401,
      },
    );
  }

  if (error instanceof PermissionDeniedError) {
    return NextResponse.json(
      {
        error: "Application access is required.",
      },
      {
        status: 403,
      },
    );
  }

  return null;
}

export async function GET(request: Request) {
  const user = await resolveUserFromHeaders(request.headers);

  try {
    requireAnyCapability(user, [
      capabilities.applicationReadAssigned,
      capabilities.applicationReadAll,
    ]);
    const applications = await getApplications(user);
    return NextResponse.json(applications);
  } catch (error) {
    const response = authorizationError(error);
    if (response) {
      return response;
    }

    return NextResponse.json(
      {
        error: "Applications could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}
