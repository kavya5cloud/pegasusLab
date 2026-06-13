import { NextResponse } from "next/server";
import { isDemoMode, getBackendLabel } from "@/lib/claude";

export async function GET() {
  return NextResponse.json({
    demo: isDemoMode(),
    backend: getBackendLabel(),
  });
}
