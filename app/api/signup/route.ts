import { NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/store";
import { hashPassword } from "@/lib/password";
import { sendWelcomeEmail } from "@/lib/resend";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim() || email.split("@")[0];
  const password = String(body.password ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  try {
    if (await getUserByEmail(email)) {
      return NextResponse.json(
        { error: "An account with this email already exists — sign in instead." },
        { status: 409 }
      );
    }
    await createUser({ email, name, passwordHash: hashPassword(password) });
  } catch (err) {
    console.error("[signup] storage failed:", err);
    return NextResponse.json(
      { error: "Account storage is unreachable — check DATABASE_URL on the server." },
      { status: 503 }
    );
  }

  if (process.env.RESEND_API_KEY) {
    // Fire-and-forget — signup must not fail because email did.
    sendWelcomeEmail(email, name).catch((err) =>
      console.error("[signup] welcome email failed:", err)
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
