import { NextResponse } from "next/server";
import { isDemoMode, getBackendLabel } from "@/lib/claude";
import { availableProviders } from "@/auth";

export async function GET() {
  return NextResponse.json({
    demo: isDemoMode(),
    backend: getBackendLabel(),
    fallback: process.env.GROQ_API_KEY
      ? `Groq (${process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"})`
      : null,
    auth: availableProviders(),
    authSecret: !!process.env.AUTH_SECRET,
    db: !!process.env.DATABASE_URL,
  });
}
