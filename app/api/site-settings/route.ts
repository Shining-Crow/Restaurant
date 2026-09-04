import { NextResponse } from "next/server";
import { requireAdminMenuKey } from "@/lib/admin-menu-auth";
import { getPrisma } from "@/lib/prisma";
import { loadSiteSettingsRecord } from "@/lib/site-settings-data";
import { patchSiteSettingsBodySchema } from "@/lib/validators/site-settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const values = await loadSiteSettingsRecord();
    return NextResponse.json({ values });
  } catch (e) {
    console.error("[site-settings GET]", e);
    return NextResponse.json({ error: "Could not load settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = requireAdminMenuKey(request);
  if (denied) return denied;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSiteSettingsBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const prisma = getPrisma();
    for (const [key, value] of Object.entries(parsed.data.settings)) {
      await prisma.siteSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[site-settings PATCH]", e);
    return NextResponse.json({ error: "Could not save settings" }, { status: 500 });
  }
}
