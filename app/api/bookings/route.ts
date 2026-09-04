import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { createBookingBodySchema } from "@/lib/validators/booking";

export const runtime = "nodejs";

function parseYmdUtc(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new Error("invalid date");
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d));
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Bookings are not configured (missing DATABASE_URL)." },
      { status: 503 },
    );
  }

  try {
    const json: unknown = await request.json();
    const parsed = createBookingBodySchema.safeParse(json);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Invalid booking details.", fieldErrors },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const bookingDate = parseYmdUtc(body.bookingDate);
    const specialTrimmed = body.specialRequests?.trim();
    const specialRequests =
      specialTrimmed && specialTrimmed.length > 0 ? specialTrimmed : null;

    const prisma = getPrisma();
    const booking = await prisma.booking.create({
      data: {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        bookingDate,
        bookingTime: body.bookingTime,
        guestCount: body.guestCount,
        specialRequests,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: booking.id.toString() });
  } catch (e) {
    console.error("[bookings POST]", e);
    return NextResponse.json({ error: "Could not save your booking." }, { status: 500 });
  }
}
