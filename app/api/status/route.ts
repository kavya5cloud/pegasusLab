import { NextResponse } from "next/server";
import { isDemoMode, getBackendLabel } from "@/lib/claude";
import { availableProviders } from "@/auth";

export async function GET() {
  return NextResponse.json({
    demo: isDemoMode(),
    backend: getBackendLabel(),
    auth: availableProviders(),
    db: !!process.env.DATABASE_URL,
  });
}
