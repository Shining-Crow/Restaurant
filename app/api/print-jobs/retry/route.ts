import { NextResponse } from "next/server";
import { requireAdminMenuKey } from "@/lib/admin-menu-auth";
import { processDuePrintRetries } from "@/lib/sunmi/print-order";

export const runtime = "nodejs";

/**
 * Process due kitchen print retries.
 * Auth: ADMIN_MENU_KEY Bearer, or Authorization: Bearer CRON_SECRET / ?key=.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const urlKey = new URL(request.url).searchParams.get("key")?.trim();

  const cronOk = Boolean(
    cronSecret && (bearer === cronSecret || urlKey === cronSecret),
  );

  if (!cronOk) {
    const denied = requireAdminMenuKey(request);
    if (denied) return denied;
  }

  try {
    const result = await processDuePrintRetries(25);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[print-jobs/retry]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Retry failed" },
      { status: 500 },
    );
  }
}
