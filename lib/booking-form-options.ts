export const BOOKING_TIME_OPTIONS = [
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
] as const;

export type BookingTimeOption = (typeof BOOKING_TIME_OPTIONS)[number];

export const GUEST_COUNT_OPTIONS = [
  "1 guest",
  "2 guests",
  "3 guests",
  "4 guests",
  "5 guests",
  "6 guests",
  "7\u20138 guests",
  "9\u201312 guests (large group)",
] as const;

export type GuestCountOption = (typeof GUEST_COUNT_OPTIONS)[number];
