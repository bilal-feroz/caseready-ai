import { NextResponse } from "next/server";
import { validateStartup } from "@/lib/runtime";
import { ensureDbReady } from "@/db/provision";

// Must run per request; a static route would freeze the build-time health result.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDbReady();
  } catch {
    // validateStartup will report the schema problem below
  }
  const validation = await validateStartup();
  return NextResponse.json({
    status: validation.healthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    ...validation,
  }, { status: validation.healthy ? 200 : 503 });
}
