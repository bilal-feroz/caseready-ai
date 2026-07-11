import { NextResponse } from "next/server";
import { validateStartup } from "@/lib/runtime";

export async function GET() {
  const validation = validateStartup();
  return NextResponse.json({
    status: validation.healthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    ...validation,
  }, { status: validation.healthy ? 200 : 503 });
}
