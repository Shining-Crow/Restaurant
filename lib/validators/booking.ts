import * as z from "zod";
import {
  BOOKING_TIME_OPTIONS,
  GUEST_COUNT_OPTIONS,
} from "@/lib/booking-form-options";

const times = BOOKING_TIME_OPTIONS as readonly string[];
const guests = GUEST_COUNT_OPTIONS as readonly string[];

function parseYmdUtc(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

export const createBookingBodySchema = z.object({
  customerName: z.string().trim().min(1).max(200),
  customerPhone: z.string().trim().min(6).max(40),
  customerEmail: z.string().trim().email().max(254),
  bookingDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => parseYmdUtc(s) !== null, "Invalid date")
    .refine((s) => {
      const booking = parseYmdUtc(s);
      if (!booking) return false;
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      return booking >= today;
    }, "Date must be today or later"),
  bookingTime: z.string().refine((s) => times.includes(s), "Invalid time"),
  guestCount: z.string().refine((s) => guests.includes(s), "Invalid guest count"),
  specialRequests: z.string().max(5000).optional(),
});

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;
