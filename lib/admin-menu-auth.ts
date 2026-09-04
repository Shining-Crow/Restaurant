import { NextResponse } from "next/server";

export function requireAdminMenuKey(request: Request): NextResponse | null {
  const secret = process.env.ADMIN_MENU_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "Admin menu API is not configured (missing ADMIN_MENU_KEY)." },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
