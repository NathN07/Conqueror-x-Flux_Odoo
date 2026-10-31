import { NextRequest, NextResponse } from "next/server";
import { runBillingJob } from "@/lib/billing";

/**
 * Automated Cron & REST Route to trigger recurring billing job.
 * Protected by CRON_SECRET from environment.
 * Accepts GET or POST with:
 * - Header: Authorization: Bearer <CRON_SECRET>
 * - Header: x-cron-secret: <CRON_SECRET>
 * - Query param: ?secret=<CRON_SECRET>
 */
async function handleBillingTrigger(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET;

  if (!configuredSecret) {
    return NextResponse.json(
      { error: "Server misconfiguration: CRON_SECRET is not configured in .env" },
      { status: 500 }
    );
  }

  // Check auth
  const authHeader = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");

  let providedSecret = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedSecret = authHeader.substring(7).trim();
  } else if (headerSecret) {
    providedSecret = headerSecret.trim();
  } else if (querySecret) {
    providedSecret = querySecret.trim();
  }

  if (providedSecret !== configuredSecret) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing CRON_SECRET" },
      { status: 401 }
    );
  }

  try {
    const summary = await runBillingJob(new Date());
    return NextResponse.json({
      success: true,
      message: "Billing job executed successfully.",
      summary,
    });
  } catch (error: any) {
    console.error("Billing cron error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute billing job." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleBillingTrigger(request);
}

export async function POST(request: NextRequest) {
  return handleBillingTrigger(request);
}
