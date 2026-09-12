import { NextResponse } from "next/server";

import { contactSubmissionSchema } from "@/modules/engagement/engagement.schema";
import { saveContactSubmission } from "@/modules/engagement/engagement.service";

export async function POST(request: Request) {
  const result = contactSubmissionSchema.safeParse(await request.json().catch(() => null));
  if (!result.success) {
    return NextResponse.json({ error: "Please check the highlighted information and try again." }, { status: 400 });
  }
  try {
    await saveContactSubmission(result.data);
    return NextResponse.json({ message: "Thank you. Your message has been received." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "We could not send your message. Please email info@smefund.na." }, { status: 503 });
  }
}
