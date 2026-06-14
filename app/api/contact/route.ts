import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/resend";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, company, teamSize, message } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    // Gracefully no-op when Resend isn't configured (dev without a key).
    console.log("[contact] RESEND_API_KEY not set — skipping email send");
    return NextResponse.json({ ok: true });
  }

  try {
    await sendContactEmail({ name, email, company, teamSize, message });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] Resend error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
