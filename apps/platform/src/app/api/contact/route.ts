import { NextResponse } from "next/server";

import { contactSubmissionSchema } from "@/modules/engagement/EngagementSchemas";
import { saveContactSubmission } from "@/modules/engagement/ServerEngagementService";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = contactSubmissionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Please check the highlighted information and try again.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    await saveContactSubmission(result.data);
    return NextResponse.json(
      {
        message: "Thank you. Your message has been received.",
      },
      {
        status: 201,
      },
    );
  } catch {
    return NextResponse.json(
      {
        error: "We could not send your message. Please email info@smefund.na.",
      },
      {
        status: 503,
      },
    );
  }
}
