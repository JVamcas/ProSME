import { NextResponse } from "next/server";

import { newsletterSubscriptionSchema } from "@/modules/engagement/engagement.schema";
import { saveNewsletterSubscription } from "@/modules/engagement/engagement.service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = newsletterSubscriptionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Enter a valid email and accept the consent checkbox.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    await saveNewsletterSubscription(result.data);
    return NextResponse.json(
      {
        message: "You are subscribed for SME Fund updates.",
      },
      {
        status: 201,
      },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Subscription is temporarily unavailable. Please try again.",
      },
      {
        status: 503,
      },
    );
  }
}
