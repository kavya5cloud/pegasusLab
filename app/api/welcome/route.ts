import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/resend";

export async function POST(req: Request) {
  const { name, email } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.log("[welcome] RESEND_API_KEY not set — skipping welcome email");
    return NextResponse.json({ ok: true });
  }

  try {
    await sendWelcomeEmail(email, name ?? email.split("@")[0]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[welcome] Resend error:", err);
    // Non-fatal — signup still succeeds even if the email fails.
    return NextResponse.json({ ok: true });
  }
}
